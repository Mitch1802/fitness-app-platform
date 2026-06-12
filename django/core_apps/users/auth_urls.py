from django.urls import path
from dj_rest_auth.jwt_auth import get_refresh_view
from .views import CsrfCookieView, ForceLogoutView, PublicLoginView

urlpatterns = [
    path("csrf/", CsrfCookieView.as_view(), name="csrf_cookie"),
    path("login/", PublicLoginView.as_view(), name="rest_login"),
    path("logout/", ForceLogoutView.as_view(), name="rest_logout"),
    path("token/refresh/", get_refresh_view().as_view(), name="token_refresh"),
]
