from predict import predict
from fastapi import FastAPI

app = FastAPI()

class StudentType:
    student_id: str
    major: str
    gpa: str
    extra_curricular: str
    gender: str 
    age: str
    num_past_internships: str
    num_programming_languages: str
   

@app.post("/predict")
async def predict_from_student(student: StudentType) -> dict:
    prediction = predict(student)
    print(f"prediction = {prediction}")
    return prediction
