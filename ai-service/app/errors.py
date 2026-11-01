"""Typed errors mapped to the shared {success:false, error:{code,message}} envelope."""


class AIServiceError(Exception):
    status_code = 500
    code = "AI_INTERNAL_ERROR"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class NotConfiguredError(AIServiceError):
    status_code = 503
    code = "AI_NOT_CONFIGURED"


class ProviderError(AIServiceError):
    status_code = 502
    code = "AI_PROVIDER_ERROR"


class InvalidInputError(AIServiceError):
    status_code = 422
    code = "INVALID_INPUT"
