"""
Ollama LLM Client for generating natural language explanations.

Why Ollama:
- Free and local - no API keys or costs
- Privacy - data never leaves your machine
- Flexible - supports multiple open-source models
- Demonstrates self-hosted LLM deployment skills

Usage:
    client = OllamaClient()
    response = await client.generate("Explain this prediction...")
"""

import httpx
import asyncio
from typing import Optional

from app.config import settings


class OllamaClient:
    """
    Async client for Ollama LLM API.

    Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
    """

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: int | None = None,
    ):
        """
        Initialize Ollama client.

        Args:
            base_url: Ollama server URL (default: http://localhost:11434)
            model: Model name (default: llama3.2)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 300,
    ) -> str:
        """
        Generate text completion from Ollama.

        Args:
            prompt: The prompt to send to the model
            temperature: Controls randomness (0 = deterministic, 1 = creative)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response

        Raises:
            OllamaConnectionError: If Ollama server is unreachable
            OllamaGenerationError: If generation fails
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
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

            except httpx.ConnectError:
                raise OllamaConnectionError(
                    f"Cannot connect to Ollama at {self.base_url}. "
                    "Ensure Ollama is running: 'ollama serve'"
                )
            except httpx.TimeoutException:
                raise OllamaGenerationError(
                    f"Ollama request timed out after {self.timeout}s. "
                    "Try a smaller model or increase timeout."
                )
            except httpx.HTTPStatusError as e:
                raise OllamaGenerationError(f"Ollama API error: {e.response.text}")

    async def is_available(self) -> bool:
        """Check if Ollama server is running and model is available."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                # Check server is up
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code != 200:
                    return False

                # Check model is installed
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]

                # Match model name (ollama uses name:tag format)
                model_available = any(
                    self.model in m or m.startswith(self.model)
                    for m in models
                )

                return model_available

        except Exception:
            return False

    async def list_models(self) -> list[str]:
        """List available models on the Ollama server."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            return []


class OllamaConnectionError(Exception):
    """Raised when Ollama server is not reachable."""
    pass


class OllamaGenerationError(Exception):
    """Raised when text generation fails."""
    pass


# Singleton client instance
_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create the Ollama client singleton."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client


# Convenience functions for direct use
async def generate_text(prompt: str, **kwargs) -> str:
    """Generate text using the default Ollama client."""
    client = get_ollama_client()
    return await client.generate(prompt, **kwargs)


async def check_ollama_status() -> dict:
    """
    Check Ollama server status.

    Returns dict with:
        - available: bool
        - models: list of installed models
        - configured_model: the model we're using
        - model_ready: whether our model is installed
    """
    client = get_ollama_client()
    available = await client.is_available()
    models = await client.list_models() if available else []

    return {
        "available": available,
        "models": models,
        "configured_model": client.model,
        "model_ready": available and any(
            client.model in m or m.startswith(client.model)
            for m in models
        ),
    }
