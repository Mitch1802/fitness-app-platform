from django.urls import path
from .views import RegisterView, UserSelfView, UserUpdateView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="user-register"),
    path("self/", UserSelfView.as_view(), name="user-self"),
    path("self/update/", UserUpdateView.as_view(), name="user-update"),
]
