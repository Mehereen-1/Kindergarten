import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  ensureSecurityAlertAudioServiceReady,
  getSecurityAlertServiceStatus,
} from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';

const MODELS_DIR = path.join(process.cwd(), 'secuirty-alerts', 'anomalyModels');
const REGISTRY_PATH = path.join(MODELS_DIR, 'admin-model-registry.json');
const PROTECTED_MODELS = new Set(['fire_best.onnx']);
const MAX_MODEL_SIZE_BYTES = 300 * 1024 * 1024;
const MAX_AUDIO_MODEL_SIZE_BYTES = 600 * 1024 * 1024;
const MAX_AUDIO_CONFIG_SIZE_BYTES = 2 * 1024 * 1024;
const AUDIO_MODEL_FILE = 'final_audio_model_extratune.keras';
const AUDIO_CONFIG_FILE = 'final_audio_config_extratune.json';

type ModelKind = 'visual' | 'audio';

type RegistryItem = {
  kind: ModelKind;
  fileName: string;
  fileSize: number;
  checksumSha256: string;
  uploadedAt: string;
  notes: string;
  eventType: string;
};

type RegistryFile = {
  version: 1;
  items: RegistryItem[];
};

function normalizeStem(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function toEventType(fileName: string) {
  return path.basename(fileName, '.onnx').toLowerCase().replace(/[\s-]+/g, '_');
}

function parseKind(value: string | null): ModelKind {
  return value?.toLowerCase() === 'audio' ? 'audio' : 'visual';
}

function sha256FromBytes(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function ensureModelsDir() {
  await fs.mkdir(MODELS_DIR, { recursive: true });
}

async function readRegistry(): Promise<RegistryFile> {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as RegistryFile;
    if (!Array.isArray(parsed?.items)) {
      return { version: 1, items: [] };
    }

    const migratedItems: RegistryItem[] = parsed.items
      .map((item) => {
        const kind = item?.kind === 'audio' ? 'audio' : 'visual';
        return {
          ...item,
          kind,
          eventType:
            typeof item?.eventType === 'string' && item.eventType.trim()
              ? item.eventType
              : kind === 'audio'
                ? 'security_audio'
                : toEventType(String(item?.fileName || 'model.onnx')),
        } as RegistryItem;
      })
      .filter((item) => typeof item?.fileName === 'string' && item.fileName.length > 0);

    return {
      version: 1,
      items: migratedItems,
    };
  } catch {
    return { version: 1, items: [] };
  }
}

async function writeRegistry(registry: RegistryFile) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

async function listLocalModels() {
  await ensureModelsDir();
  let serviceStatus = await getSecurityAlertServiceStatus();
  if (
    serviceStatus.running &&
    Array.isArray((serviceStatus.health as any)?.models) &&
    !(serviceStatus.health as any).models.some(
      (item: any) => String(item?.name || '') === 'audio_security_model' && Boolean(item?.loaded)
    )
  ) {
    try {
      serviceStatus = await ensureSecurityAlertAudioServiceReady(90000);
    } catch {
      // Keep the existing status if the restart path is not available.
    }
  }

  const [entries, registry] = await Promise.all([
    fs.readdir(MODELS_DIR, { withFileTypes: true }),
    readRegistry(),
  ]);

  const modelNamesFromService = new Set(
    Array.isArray((serviceStatus.health as any)?.models)
      ? (serviceStatus.health as any).models
          .map((item: any) => String(item?.name || ''))
          .filter(Boolean)
      : []
  );

  const audioModelFromService = Array.isArray((serviceStatus.health as any)?.models)
    ? (serviceStatus.health as any).models.find((item: any) => String(item?.name || '') === 'audio_security_model')
    : null;

  const visualModels = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
      .map(async (entry) => {
        const fullPath = path.join(MODELS_DIR, entry.name);
        const stat = await fs.stat(fullPath);
        const registryItem = registry.items.find((item) => item.kind === 'visual' && item.fileName === entry.name);
        const modelName = `${path.basename(entry.name, '.onnx').toLowerCase().replace(/[\s-]+/g, '_')}_model`;

        return {
          fileName: entry.name,
          modelName,
          eventType: registryItem?.eventType || toEventType(entry.name),
          fileSize: stat.size,
          uploadedAt: registryItem?.uploadedAt || null,
          checksumSha256: registryItem?.checksumSha256 || null,
          notes: registryItem?.notes || '',
          protected: PROTECTED_MODELS.has(entry.name),
          loadedByService: modelNamesFromService.has(modelName),
        };
      })
  );

  visualModels.sort((a, b) => a.fileName.localeCompare(b.fileName));

  const audioModelPath = path.join(MODELS_DIR, AUDIO_MODEL_FILE);
  const audioConfigPath = path.join(MODELS_DIR, AUDIO_CONFIG_FILE);

  const [audioModelStat, audioConfigStat] = await Promise.all([
    fs.stat(audioModelPath).catch(() => null),
    fs.stat(audioConfigPath).catch(() => null),
  ]);

  const audioModelRegistry = registry.items.find((item) => item.kind === 'audio' && item.fileName === AUDIO_MODEL_FILE);
  const audioConfigRegistry = registry.items.find((item) => item.kind === 'audio' && item.fileName === AUDIO_CONFIG_FILE);

  const audio = {
    expectedModelFile: AUDIO_MODEL_FILE,
    expectedConfigFile: AUDIO_CONFIG_FILE,
    hasModelFile: Boolean(audioModelStat),
    hasConfigFile: Boolean(audioConfigStat),
    modelFileSize: audioModelStat?.size ?? 0,
    configFileSize: audioConfigStat?.size ?? 0,
    uploadedAt:
      audioModelRegistry?.uploadedAt || audioConfigRegistry?.uploadedAt || null,
    modelChecksumSha256: audioModelRegistry?.checksumSha256 || null,
    configChecksumSha256: audioConfigRegistry?.checksumSha256 || null,
    notes: audioModelRegistry?.notes || audioConfigRegistry?.notes || '',
    enabled: Boolean(audioModelFromService?.enabled),
    loadedByService: Boolean(audioModelFromService?.loaded),
    loadError: audioModelFromService?.extra?.load_error || null,
  };

  return {
    service: {
      running: Boolean(serviceStatus.running),
      startedAt: serviceStatus.startedAt,
      serviceUrl: serviceStatus.serviceUrl,
      health: serviceStatus.health,
    },
    models: visualModels,
    audio,
  };
}

export async function GET(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'view anomaly models');
  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await listLocalModels();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list anomaly models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'upload anomaly models');
  if (!access.ok) {
    return access.response;
  }

  try {
    await ensureModelsDir();

    const form = await request.formData();
    const kind = parseKind(String(form.get('kind') || 'visual'));
    const notes = String(form.get('notes') || '').trim().slice(0, 500);
    const uploadedAt = new Date().toISOString();

    if (kind === 'audio') {
      const audioModelFile = form.get('audio_model');
      const audioConfigFile = form.get('audio_config');

      if (!(audioModelFile instanceof File) || !(audioConfigFile instanceof File)) {
        return NextResponse.json(
          { error: 'Audio upload requires both .keras model file and .json config file' },
          { status: 400 }
        );
      }

      if (path.extname(audioModelFile.name || '').toLowerCase() !== '.keras') {
        return NextResponse.json({ error: 'Audio model must be a .keras file' }, { status: 400 });
      }
      if (path.extname(audioConfigFile.name || '').toLowerCase() !== '.json') {
        return NextResponse.json({ error: 'Audio config must be a .json file' }, { status: 400 });
      }

      const modelBytes = Buffer.from(await audioModelFile.arrayBuffer());
      const configBytes = Buffer.from(await audioConfigFile.arrayBuffer());
      if (!modelBytes.length) {
        return NextResponse.json({ error: 'Audio model file is empty' }, { status: 400 });
      }
      if (!configBytes.length) {
        return NextResponse.json({ error: 'Audio config file is empty' }, { status: 400 });
      }
      if (modelBytes.length > MAX_AUDIO_MODEL_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Audio model exceeds ${Math.round(MAX_AUDIO_MODEL_SIZE_BYTES / (1024 * 1024))}MB limit` },
          { status: 400 }
        );
      }
      if (configBytes.length > MAX_AUDIO_CONFIG_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Audio config exceeds ${Math.round(MAX_AUDIO_CONFIG_SIZE_BYTES / (1024 * 1024))}MB limit` },
          { status: 400 }
        );
      }

      let parsedConfig: any = null;
      try {
        parsedConfig = JSON.parse(configBytes.toString('utf8'));
      } catch {
        return NextResponse.json({ error: 'Audio config JSON is invalid' }, { status: 400 });
      }

      if (!parsedConfig || typeof parsedConfig !== 'object') {
        return NextResponse.json({ error: 'Audio config must be a JSON object' }, { status: 400 });
      }

      await Promise.all([
        fs.writeFile(path.join(MODELS_DIR, AUDIO_MODEL_FILE), modelBytes),
        fs.writeFile(path.join(MODELS_DIR, AUDIO_CONFIG_FILE), JSON.stringify(parsedConfig, null, 2), 'utf8'),
      ]);

      const configNormalizedBytes = Buffer.from(JSON.stringify(parsedConfig, null, 2), 'utf8');
      const registry = await readRegistry();
      const withoutAudio = registry.items.filter((item) => item.kind !== 'audio');

      const audioItems: RegistryItem[] = [
        {
          kind: 'audio',
          fileName: AUDIO_MODEL_FILE,
          fileSize: modelBytes.length,
          checksumSha256: sha256FromBytes(modelBytes),
          uploadedAt,
          notes,
          eventType: 'security_audio',
        },
        {
          kind: 'audio',
          fileName: AUDIO_CONFIG_FILE,
          fileSize: configNormalizedBytes.length,
          checksumSha256: sha256FromBytes(configNormalizedBytes),
          uploadedAt,
          notes,
          eventType: 'security_audio',
        },
      ];

      await writeRegistry({ version: 1, items: [...withoutAudio, ...audioItems] });

      return NextResponse.json({
        ok: true,
        kind: 'audio',
        files: {
          model: AUDIO_MODEL_FILE,
          config: AUDIO_CONFIG_FILE,
        },
        message:
          'Audio model and config uploaded successfully. Restart anomaly service to activate sound anomaly.',
      });
    }

    const file = form.get('model');
    const requestedName = String(form.get('name') || '').trim();
    const requestedEventType = normalizeStem(String(form.get('eventType') || ''));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Model file is required' }, { status: 400 });
    }

    const originalName = String(file.name || '').trim();
    const extension = path.extname(originalName).toLowerCase();
    if (extension !== '.onnx') {
      return NextResponse.json({ error: 'Only .onnx files are supported' }, { status: 400 });
    }

    const fileNameStem = normalizeStem(requestedName || path.basename(originalName, '.onnx'));
    if (!fileNameStem) {
      return NextResponse.json({ error: 'Model name is invalid' }, { status: 400 });
    }

    const fileName = `${fileNameStem}.onnx`;
    if (PROTECTED_MODELS.has(fileName)) {
      return NextResponse.json(
        { error: `${fileName} is reserved by the system. Please use a different file name.` },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.length) {
      return NextResponse.json({ error: 'Model file is empty' }, { status: 400 });
    }
    if (bytes.length > MAX_MODEL_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Model exceeds ${Math.round(MAX_MODEL_SIZE_BYTES / (1024 * 1024))}MB limit` },
        { status: 400 }
      );
    }

    const filePath = path.join(MODELS_DIR, fileName);
    await fs.writeFile(filePath, bytes);

    const checksumSha256 = sha256FromBytes(bytes);

    const registry = await readRegistry();
    const eventType = requestedEventType || toEventType(fileName);
    const nextItem: RegistryItem = {
      kind: 'visual',
      fileName,
      fileSize: bytes.length,
      checksumSha256,
      uploadedAt,
      notes,
      eventType,
    };

    const withoutCurrent = registry.items.filter((item) => !(item.kind === 'visual' && item.fileName === fileName));
    await writeRegistry({ version: 1, items: [...withoutCurrent, nextItem] });

    return NextResponse.json({
      ok: true,
      model: nextItem,
      message:
        'Model uploaded. Restart anomaly service to guarantee the new model is loaded into runtime.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload anomaly model' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'delete anomaly models');
  if (!access.ok) {
    return access.response;
  }

  try {
    const kind = parseKind(request.nextUrl.searchParams.get('kind'));

    if (kind === 'audio') {
      await Promise.all([
        fs.unlink(path.join(MODELS_DIR, AUDIO_MODEL_FILE)).catch(() => undefined),
        fs.unlink(path.join(MODELS_DIR, AUDIO_CONFIG_FILE)).catch(() => undefined),
      ]);

      const registry = await readRegistry();
      await writeRegistry({
        version: 1,
        items: registry.items.filter((item) => item.kind !== 'audio'),
      });

      return NextResponse.json({
        ok: true,
        message: 'Audio anomaly files removed. Restart anomaly service to apply changes.',
      });
    }

    const name = String(request.nextUrl.searchParams.get('name') || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Model file name is required' }, { status: 400 });
    }

    const safeName = path.basename(name);
    if (!safeName.toLowerCase().endsWith('.onnx')) {
      return NextResponse.json({ error: 'Only .onnx files can be deleted' }, { status: 400 });
    }

    if (PROTECTED_MODELS.has(safeName)) {
      return NextResponse.json({ error: `${safeName} is protected and cannot be deleted` }, { status: 400 });
    }

    const filePath = path.join(MODELS_DIR, safeName);
    await fs.unlink(filePath);

    const registry = await readRegistry();
    await writeRegistry({
      version: 1,
      items: registry.items.filter((item) => !(item.kind === 'visual' && item.fileName === safeName)),
    });

    return NextResponse.json({
      ok: true,
      message: 'Model deleted. Restart anomaly service to apply changes cleanly.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete anomaly model';
    const status = /ENOENT/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
