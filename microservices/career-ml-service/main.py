# # from predict import predict
# # from fastapi import FastAPI

# # app = FastAPI()

# # class StudentType:
# #     student_id: str
# #     major: str
# #     gpa: str
# #     extra_curricular: str
# #     gender: str 
# #     age: str
# #     num_past_internships: str
# #     num_programming_languages: str
   

# # @app.post("/predict")
# # async def predict_from_student(student: StudentType) -> dict:
# #     prediction = predict(student)
# #     print(f"prediction = {prediction}")
# #     return prediction
# # from predict import predict
# # from fastapi import FastAPI

# # app = FastAPI()

# # @app.post("/predict")
# # async def predict_from_student(student):
# #     prediction = predict(student)
# #     print(f"prediction = {prediction}")
# #     return prediction

# from typing import Union
# from fastapi import FastAPI
# from pydantic import BaseModel
# from predict import predict

# app = FastAPI()
# class StudentData(BaseModel):
#     student_id: str
#     major: str
#     age: str
#     gender: str
#     gpa: str
#     extra_curricular: str
#     num_programming_languages: str
#     num_past_internships: str

# @app.post("/predict")
# async def process_student_data(studentData: StudentData):
#     return predict(studentData)

from predict import predict
from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI()


class StudentData(BaseModel):
    student_id: str
    age: str
    major: str
    gender: str
    gpa: str
    num_past_internships: str
    extra_curricular: str
    num_programming_languages: str    


@app.post("/predict")
async def process_student_data(studentData: StudentData):
    try:
        prediction = predict(studentData)
        print(f"""Prediction = {prediction}""")
        return predict(studentData)
    except Exception as exp:
        print(f"""Failed to predict""")
        raise exp
