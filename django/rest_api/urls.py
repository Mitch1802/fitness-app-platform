from django.urls import path, include
from django.conf import settings

API_PATH = settings.API_URL_PATH

urlpatterns = [
    path(f"{API_PATH}users/", include("core_apps.users.urls")),
    path(f"{API_PATH}auth/", include("core_apps.users.auth_urls")),
    path(f"{API_PATH}training/", include("core_apps.training.urls")),
]
