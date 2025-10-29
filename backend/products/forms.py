# forms.py
from django import forms
from .models import ProductVariant

class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        allow_return = cleaned_data.get('allow_return')
        return_days = cleaned_data.get('return_days')
        allow_replacement = cleaned_data.get('allow_replacement')
        replacement_days = cleaned_data.get('replacement_days')

        # Return validation
        if allow_return:
            if return_days is None or return_days <= 0:
                self.add_error('return_days', "Return days must be greater than 0 if returnable.")
            elif return_days > 30:
                self.add_error('return_days', "Return days cannot exceed 30.")
        else:
            cleaned_data['return_days'] = None

        # Replacement validation
        if allow_replacement:
            if replacement_days is None or replacement_days <= 0:
                self.add_error('replacement_days', "Replacement days must be greater than 0 if replacement-only.")
            elif replacement_days > 30:
                self.add_error('replacement_days', "Replacement days cannot exceed 30.")
        else:
            cleaned_data['replacement_days'] = None

        
        return cleaned_data
