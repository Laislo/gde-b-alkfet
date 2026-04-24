# Friss, stabil Python 3.12
FROM python:3.12-bookworm

WORKDIR /app

# Rendszer szintű függőségek (ha kellenének az uvicorn-nak)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Frissítsük a pip-et is
RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Az MCP szerver portja
EXPOSE 8000

CMD ["python", "main.py"]