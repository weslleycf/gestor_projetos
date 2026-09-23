from django.urls import path

from .views import LogoutView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
