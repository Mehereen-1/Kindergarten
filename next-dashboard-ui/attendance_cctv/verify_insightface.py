from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=-1)   # 0 = GPU, -1 = CPU

print("InsightFace working successfully!")
