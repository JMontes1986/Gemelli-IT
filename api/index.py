# api/index.py
# Este archivo es el punto de entrada para Vercel serverless.
# Debe estar en la RAÍZ del proyecto (no dentro de apps/api).
import sys
import os

# Agrega apps/api al path para que Python encuentre el módulo app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from app.main import handler
