"""
GhostBit Scores Routes
POST /scores        – submit a score (auth required)
GET  /scores/{game} – get top-10 leaderboard for a game (auth required)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from . import database as db
from .auth import get_current_user

router = APIRouter(prefix="/scores", tags=["scores"])

VALID_GAMES = {"snake", "tictactoe", "memory", "pixelrunner"}


class ScoreSubmit(BaseModel):
    game: str
    score: int = Field(ge=0)


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    score: int


@router.post("", status_code=201)
def submit_score(body: ScoreSubmit, user: dict = Depends(get_current_user)):
    if body.game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail=f"Invalid game. Must be one of: {', '.join(VALID_GAMES)}")
    db.submit_score(user["id"], user["username"], body.game, body.score)
    return {"status": "ok"}


@router.get("/{game}", response_model=list[LeaderboardEntry])
def get_leaderboard(game: str, user: dict = Depends(get_current_user)):
    if game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail="Invalid game")
    entries = db.get_leaderboard(game)
    return [{"rank": i + 1, **e} for i, e in enumerate(entries)]
