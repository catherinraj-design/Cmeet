import asyncio
import uuid
from typing import AsyncGenerator, Dict, Any
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.core_erp import School, Branch, AcademicClass, User, UserRole, ClassEnrollment
from app.main import app

# In-memory SQLite for high-speed isolated tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def seed_data(db_session: AsyncSession) -> Dict[str, Any]:
    # School 1
    school1 = School(id=uuid.uuid4(), name="Greenwood High", code="GWH")
    db_session.add(school1)
    await db_session.flush()

    branch1 = Branch(id=uuid.uuid4(), school_id=school1.id, name="Main Campus", code="MAIN")
    db_session.add(branch1)
    await db_session.flush()

    academic_class1 = AcademicClass(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        name="Grade 10",
        section="A",
    )
    db_session.add(academic_class1)
    await db_session.flush()

    # School 2 (For cross-school isolation testing)
    school2 = School(id=uuid.uuid4(), name="Oakridge Academy", code="ORA")
    db_session.add(school2)
    await db_session.flush()

    pwd_hash = get_password_hash("password123")

    teacher1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="teacher1@greenwood.edu",
        full_name="Sarah Jenkins",
        role=UserRole.TEACHER,
        hashed_password=pwd_hash,
    )
    student1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="student1@greenwood.edu",
        full_name="Alex Rivera",
        role=UserRole.STUDENT,
        hashed_password=pwd_hash,
    )
    student_uninvited = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="student_uninvited@greenwood.edu",
        full_name="Leo Vance",
        role=UserRole.STUDENT,
        hashed_password=pwd_hash,
    )
    parent1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="parent1@greenwood.edu",
        full_name="Robert Rivera",
        role=UserRole.PARENT,
        hashed_password=pwd_hash,
    )
    admin1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="admin@greenwood.edu",
        full_name="Principal Skinner",
        role=UserRole.SCHOOL_ADMIN,
        hashed_password=pwd_hash,
    )
    teacher_sch2 = User(
        id=uuid.uuid4(),
        school_id=school2.id,
        branch_id=None,
        email="teacher@oakridge.edu",
        full_name="Mark Evans",
        role=UserRole.TEACHER,
        hashed_password=pwd_hash,
    )

    db_session.add_all([teacher1, student1, student_uninvited, parent1, admin1, teacher_sch2])
    await db_session.flush()

    # Enroll student1 in academic_class1
    enrollment = ClassEnrollment(
        id=uuid.uuid4(),
        academic_class_id=academic_class1.id,
        user_id=student1.id,
    )
    db_session.add(enrollment)
    await db_session.commit()

    return {
        "school1": school1,
        "school2": school2,
        "academic_class1": academic_class1,
        "teacher1": teacher1,
        "student1": student1,
        "student_uninvited": student_uninvited,
        "parent1": parent1,
        "admin1": admin1,
        "teacher_sch2": teacher_sch2,
    }


def auth_headers_for(user: User) -> Dict[str, str]:
    token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "school_id": str(user.school_id) if user.school_id else None,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "full_name": user.full_name,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    settings.ENVIRONMENT = "test"

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
