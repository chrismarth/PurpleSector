FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY math_channel_udf.py .

EXPOSE 8815

CMD ["python", "math_channel_udf.py"]
