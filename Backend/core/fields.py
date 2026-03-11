import uuid
from django.db import models

class UUIDField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 36
        kwargs['default'] = lambda: str(uuid.uuid4())
        super().__init__(*args, **kwargs)