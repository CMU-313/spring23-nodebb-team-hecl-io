FROM python:3.9-slim-buster

WORKDIR /usr/src/app/NodeBB/microservices/career-ml-service

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

COPY model.pkl .

COPY predict.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]