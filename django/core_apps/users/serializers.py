from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = ("id",)


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


RegisterSerializer = RegisterInputSerializer


class UpdateProfileSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50, min_length=3, required=False)
    password = serializers.CharField(min_length=8, write_only=True, required=False)

    def validate_username(self, value):
        user = self.context["request"].user
        if User.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Benutzername bereits vergeben.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if not attrs.get("username") and not attrs.get("password"):
            raise serializers.ValidationError("Mindestens ein Feld muss angegeben werden.")
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        if username := self.validated_data.get("username"):
            user.username = username
        if password := self.validated_data.get("password"):
            user.set_password(password)
        user.save()
        return user
