from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = ("id",)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50, min_length=3)
    # Using SerializerMethodField approach - actual field below:
    class Meta:
        pass


class RegisterInputSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50, min_length=3)
    credentials = serializers.CharField(min_length=8, write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Benutzername bereits vergeben.")
        return value

    def validate_credentials(self, value):
        validate_password(value)
        return value
