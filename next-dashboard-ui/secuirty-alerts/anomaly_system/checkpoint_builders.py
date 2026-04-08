from __future__ import annotations

from typing import Any

import torch.nn as nn
from torchvision import models

import timm


class AttentionPool(nn.Module):
    def __init__(self, dim: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim, dim // 2),
            nn.Tanh(),
            nn.Linear(dim // 2, 1),
        )

    def forward(self, x):
        weights = self.net(x).squeeze(-1)
        weights = weights.softmax(dim=1)
        return (x * weights.unsqueeze(-1)).sum(dim=1)


class FallNet(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.backbone = timm.create_model(
            "tf_efficientnetv2_b0.in1k",
            pretrained=False,
            num_classes=0,
            global_pool="avg",
        )
        feat_dim = self.backbone.num_features

        self.gru = nn.GRU(
            input_size=feat_dim,
            hidden_size=256,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
            dropout=0.0,
        )

        self.pool = AttentionPool(256 * 2)
        self.head = nn.Sequential(
            nn.LayerNorm(256 * 2),
            nn.Dropout(0.30),
            nn.Linear(256 * 2, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.30),
            nn.Linear(128, 2),
        )

    def forward(self, x):
        batch, time_steps, channels, height, width = x.shape
        x = x.view(batch * time_steps, channels, height, width)
        feats = self.backbone(x)
        feats = feats.view(batch, time_steps, -1)
        seq_out, _ = self.gru(feats)
        pooled = self.pool(seq_out)
        return self.head(pooled)


class MobileNetV3GRUFight(nn.Module):
    def __init__(self, hidden_size: int = 256, num_layers: int = 1, bidirectional: bool = True, dropout: float = 0.3) -> None:
        super().__init__()
        try:
            base = models.mobilenet_v3_large(
                weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V2
            )
        except Exception:
            base = models.mobilenet_v3_large(weights=None)

        self.backbone = base.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.feature_dim = 960
        self.hidden_size = hidden_size
        self.bidirectional = bidirectional
        self.num_dirs = 2 if bidirectional else 1
        self.gru = nn.GRU(
            input_size=self.feature_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional,
            dropout=0.0 if num_layers == 1 else dropout,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_size * self.num_dirs, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(256, 2),
        )

    def forward(self, x):
        batch, time_steps, channels, height, width = x.shape
        x = x.view(batch * time_steps, channels, height, width)
        features = self.backbone(x)
        features = self.pool(features).flatten(1)
        features = features.view(batch, time_steps, self.feature_dim)
        out, _ = self.gru(features)
        seq_feat = out[:, -1, :]
        return self.head(seq_feat)


def build_fall_model(*, checkpoint: Any = None, config: Any = None):
    return FallNet()


def build_fight_model(*, checkpoint: Any = None, config: Any = None):
    return MobileNetV3GRUFight(hidden_size=256, num_layers=1, bidirectional=True, dropout=0.3)
