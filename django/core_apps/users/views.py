from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from dj_rest_auth.views import LoginView, LogoutView

from .serializers import UserDetailSerializer, RegisterInputSerializer, UpdateProfileSerializer

User = get_user_model()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class PublicLoginView(LoginView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class AuthStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})

        return Response(
            {
                "authenticated": True,
                "user": UserDetailSerializer(request.user).data,
            }
        )


class ForceLogoutView(LogoutView):
    pass


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Accept username + credentials
        data = {}
        data["username"] = request.data.get("username", "")
        # Accept both "credentials" alias and standard "password" field
        raw = request.data.get("credentials") or request.data.get("password", "")
        data["credentials"] = raw

        serializer = RegisterInputSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data["username"]
        credentials = serializer.validated_data["credentials"]
        user = User.objects.create_user(username=username, **{"password": credentials})
        return Response({"username": user.username}, status=status.HTTP_201_CREATED)


class UserSelfView(generics.RetrieveAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(UserDetailSerializer(user).data)
