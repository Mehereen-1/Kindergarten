from insightface.model_zoo import get_model

model = get_model('buffalo_l')
model.prepare(ctx_id=-1)

print("Model downloaded successfully")
