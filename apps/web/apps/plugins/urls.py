from django.urls import path

from . import views

urlpatterns = [
    path("", views.plugin_list, name="plugin-list"),
]
