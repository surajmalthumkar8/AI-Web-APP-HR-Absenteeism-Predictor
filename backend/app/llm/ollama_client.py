"""
LLM Client for generating natural language explanations.

Supports:
1. Ollama (local) - Primary for local development
2. Hugging Face Inference API (free) - For cloud deployment

Usage:
    client = get_ollama_client()
    response = await client.generate("Explain this prediction...")
"""

import httpx
import os
from typing import Optional

from app.config import settings


class OllamaClient:
    """
    Async client for LLM text generation.
    Tries Ollama first, falls back to Hugging Face Inference API.
    """

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: int | None = None,
    ):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout

        # Hugging Face settings (free inference API)
        self.hf_model = "mistralai/Mistral-7B-Instruct-v0.2"
        self.hf_api_url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
        self.hf_token = os.environ.get("HF_TOKEN", "")

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 300,
    ) -> str:
        """Generate text using available LLM provider."""

        # Try Ollama first (local)
        try:
            if await self._check_ollama():
                return await self._generate_ollama(prompt, temperature, max_tokens)
        except Exception:
            pass

        # Try Hugging Face Inference API (free, no token required for many models)
        try:
            return await self._generate_huggingface(prompt, max_tokens)
        except Exception:
            pass

        # All failed
        raise OllamaGenerationError("No LLM provider available")

    async def _check_ollama(self) -> bool:
        """Quick check if Ollama is running."""
        try:
            async with httpx.AsyncClient(timeout=2) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def _generate_ollama(
        self, prompt: str, temperature: float, max_tokens: int
    ) -> str:
        """Generate using local Ollama."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()

    async def _generate_huggingface(self, prompt: str, max_tokens: int) -> str:
        """Generate using Hugging Face Inference API (free tier)."""
        headers = {"Content-Type": "application/json"}
        if self.hf_token:
            headers["Authorization"] = f"Bearer {self.hf_token}"

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                self.hf_api_url,
                headers=headers,
                json={
                    "inputs": prompt,
                    "parameters": {
                        "max_new_tokens": max_tokens,
                        "temperature": 0.1,
                        "return_full_text": False,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()

            # HF returns list of generated texts
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "").strip()
            return ""

    async def is_available(self) -> bool:
        """Check if any LLM provider is available."""
        # Check Ollama
        if await self._check_ollama():
            return True

        # Check HF (always available, might be rate limited)
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(
                    f"https://api-inference.huggingface.co/models/{self.hf_model}"
                )
                return response.status_code in [200, 503]  # 503 = loading, still available
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        """List available models."""
        models = []

        # Ollama models
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models.extend([m.get("name", "") for m in data.get("models", [])])
        except Exception:
            pass

        # Add HF model
        models.append(f"hf:{self.hf_model}")

        return models


class OllamaConnectionError(Exception):
    """Raised when LLM server is not reachable."""
    pass


class OllamaGenerationError(Exception):
    """Raised when text generation fails."""
    pass


# Singleton client instance
_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create the LLM client singleton."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client


async def generate_text(prompt: str, **kwargs) -> str:
    """Generate text using the default client."""
    client = get_ollama_client()
    return await client.generate(prompt, **kwargs)


async def check_ollama_status() -> dict:
    """Check LLM provider status."""
    client = get_ollama_client()
    available = await client.is_available()
    models = await client.list_models() if available else []

    return {
        "available": available,
        "models": models,
        "configured_model": client.model,
        "model_ready": available,
    }
