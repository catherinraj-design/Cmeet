import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt
from app.core.config import settings
from app.models.meeting_participant import ParticipantRole
from app.models.core_erp import UserRole


class LiveKitService:
    def __init__(
        self,
        api_key: str = settings.LIVEKIT_API_KEY,
        api_secret: str = settings.LIVEKIT_API_SECRET,
        server_url: str = settings.LIVEKIT_URL,
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.server_url = server_url

    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        participant_role: ParticipantRole,
        user_role: UserRole,
        ttl_minutes: int = settings.LIVEKIT_TOKEN_TTL_MINUTES,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generates a signed, short-lived LiveKit access token with strict room-level permissions.
        Compatible with LiveKit Cloud and LiveKit open-source server specifications.
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(minutes=ttl_minutes)

        is_admin = participant_role in (ParticipantRole.HOST, ParticipantRole.CO_HOST) or user_role in (
            UserRole.TEACHER,
            UserRole.SCHOOL_ADMIN,
            UserRole.SUPER_ADMIN,
        )

        # Video grants according to least-privilege principle
        video_grants = {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
            "roomAdmin": is_admin,
            "roomRecord": False,  # MVP explicitly excludes recording
        }

        # Try using livekit.api if installed, else fallback to standard RFC/LiveKit JWT schema
        try:
            from livekit import api  # type: ignore

            token = (
                api.AccessToken(self.api_key, self.api_secret)
                .with_identity(participant_identity)
                .with_name(participant_name)
                .with_ttl(timedelta(minutes=ttl_minutes))
                .with_grants(
                    api.VideoGrants(
                        room=room_name,
                        room_join=True,
                        can_publish=True,
                        can_subscribe=True,
                        can_publish_data=True,
                        room_admin=is_admin,
                        room_record=False,
                    )
                )
            )
            if metadata:
                token.with_metadata(json.dumps(metadata))
            return token.to_jwt()

        except ImportError:
            # Standard LiveKit JWT payload structure
            payload: Dict[str, Any] = {
                "iss": self.api_key,
                "sub": participant_identity,
                "name": participant_name,
                "nbf": int(now.timestamp()),
                "iat": int(now.timestamp()),
                "exp": int(exp.timestamp()),
                "video": video_grants,
            }
            if metadata:
                payload["metadata"] = json.dumps(metadata)

            return jwt.encode(payload, self.api_secret, algorithm="HS256")

    def verify_webhook_token(self, auth_header: str) -> Dict[str, Any]:
        """
        Validates incoming LiveKit webhook Authorization header.
        LiveKit signs webhooks using HMAC-SHA256 with API_SECRET.
        """
        token = auth_header.replace("Bearer ", "").strip()
        try:
            payload = jwt.decode(
                token,
                self.api_secret,
                algorithms=["HS256"],
                issuer=self.api_key,
                options={"verify_exp": True},
            )
            return payload
        except Exception as e:
            # If verification fails, also allow verification with webhook secret if configured
            if settings.LIVEKIT_WEBHOOK_SECRET != self.api_secret:
                try:
                    payload = jwt.decode(
                        token,
                        settings.LIVEKIT_WEBHOOK_SECRET,
                        algorithms=["HS256"],
                        options={"verify_exp": True},
                    )
                    return payload
                except Exception:
                    pass
            raise ValueError(f"Invalid webhook signature: {str(e)}")


livekit_service = LiveKitService()
