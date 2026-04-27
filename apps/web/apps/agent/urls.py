from django.urls import path

from . import views

app_name = "agent"

urlpatterns = [
    path("chat", views.chat, name="chat"),
    path("plan/approve", views.plan_approve, name="plan-approve"),
    path("plan/reject", views.plan_reject, name="plan-reject"),
    path("conversations", views.conversation_list, name="conversation-list"),
    path("conversations/<uuid:pk>", views.conversation_detail, name="conversation-detail"),
]
