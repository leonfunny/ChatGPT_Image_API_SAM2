from datetime import datetime
import inspect
from typing import Type

from fastapi import Form
from pydantic import BaseModel


class GeneralModel(BaseModel):
    model_config = {
        "from_attributes": True,
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "str_strip_whitespace": True,
        "json_encoders": {
            datetime: lambda v: v.strftime("%Y-%m-%dT%H:%M:%SZ") if v else None,
        },
    }


def as_form(cls: Type[BaseModel]):
    original_init = cls.__init__
    model_fields = cls.model_fields
    new_parameters = []

    for field_name, field_info in model_fields.items():
        field_type = field_info.annotation
        is_required = field_info.is_required()
        default_value = None if is_required else field_info.default

        new_parameters.append(
            inspect.Parameter(
                field_name,
                inspect.Parameter.POSITIONAL_ONLY,
                default=(Form(...) if is_required else Form(default_value)),
                annotation=field_type,
            )
        )

    async def as_form_func(**data):
        return cls(**data)

    sig = inspect.signature(as_form_func)
    sig = sig.replace(parameters=new_parameters)
    as_form_func.__signature__ = sig

    setattr(cls, "as_form", as_form_func)
    return cls
