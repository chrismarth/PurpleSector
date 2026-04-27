from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("me", views.me, name="me"),
    path("user/profile", views.profile, name="user-profile"),
    path("user/settings", views.settings, name="user-settings"),
    path("user/avatar", views.avatar_upload, name="user-avatar-upload"),
]
