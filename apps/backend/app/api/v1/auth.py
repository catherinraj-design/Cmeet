import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash, get_current_user
from app.models.core_erp import User, UserRole, School, Branch, AcademicClass, ClassEnrollment
from app.schemas.auth import Token, LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with ERP credentials and retrieve JWT access token."""
    res = await db.execute(select(User).where(User.email == login_data.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "school_id": str(user.school_id) if user.school_id else None,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "full_name": user.full_name,
        }
    )
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of authenticated user."""
    return current_user


@router.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """Seeds test schools, academic classes, teacher, student, and parent users for testing."""
    # Check if already seeded
    res = await db.execute(select(School).limit(1))
    if res.scalar_one_or_none():
        return {"message": "Database already seeded"}

    # School 1 (Greenwood High)
    school1 = School(id=uuid.uuid4(), name="Greenwood High School", code="GWH")
    db.add(school1)
    await db.flush()

    branch1 = Branch(id=uuid.uuid4(), school_id=school1.id, name="Main Campus", code="MAIN")
    db.add(branch1)
    await db.flush()

    academic_class1 = AcademicClass(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        name="Grade 10",
        section="A",
    )
    db.add(academic_class1)
    await db.flush()

    # School 2 (Oakridge Academy - for testing isolation)
    school2 = School(id=uuid.uuid4(), name="Oakridge Academy", code="ORA")
    db.add(school2)
    await db.flush()

    # Password hash for "password123"
    pwd_hash = get_password_hash("password123")

    # School 1 Teacher (Host)
    teacher = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="teacher@greenwood.edu",
        full_name="Sarah Jenkins (Teacher)",
        role=UserRole.TEACHER,
        hashed_password=pwd_hash,
    )
    db.add(teacher)

    # School 1 Student (Participant)
    student1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="student1@greenwood.edu",
        full_name="Alex Rivera (Student)",
        role=UserRole.STUDENT,
        hashed_password=pwd_hash,
    )
    db.add(student1)
    await db.flush()

    # Enroll student in class
    enrollment = ClassEnrollment(
        academic_class_id=academic_class1.id,
        user_id=student1.id,
    )
    db.add(enrollment)

    # School 1 Parent
    parent1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="parent1@greenwood.edu",
        full_name="Robert Rivera (Parent)",
        role=UserRole.PARENT,
        hashed_password=pwd_hash,
    )
    db.add(parent1)

    # School 1 Admin
    admin1 = User(
        id=uuid.uuid4(),
        school_id=school1.id,
        branch_id=branch1.id,
        email="admin@greenwood.edu",
        full_name="Principal Skinner (Admin)",
        role=UserRole.SCHOOL_ADMIN,
        hashed_password=pwd_hash,
    )
    db.add(admin1)

    # School 2 Teacher (for cross-school testing)
    teacher_sch2 = User(
        id=uuid.uuid4(),
        school_id=school2.id,
        email="teacher@oakridge.edu",
        full_name="Mark Evans (External Teacher)",
        role=UserRole.TEACHER,
        hashed_password=pwd_hash,
    )
    db.add(teacher_sch2)

    await db.commit()
    return {
        "message": "Demo data seeded successfully",
        "accounts": [
            {"email": "teacher@greenwood.edu", "password": "password123", "role": "TEACHER"},
            {"email": "student1@greenwood.edu", "password": "password123", "role": "STUDENT"},
            {"email": "parent1@greenwood.edu", "password": "password123", "role": "PARENT"},
            {"email": "admin@greenwood.edu", "password": "password123", "role": "SCHOOL_ADMIN"},
            {"email": "teacher@oakridge.edu", "password": "password123", "role": "TEACHER (External School)"},
        ],
    }
