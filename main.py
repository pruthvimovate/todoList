from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TaskCreate(BaseModel):
    title: str


class Task(BaseModel):
    id: int
    title: str


tasks: List[Task] = []
next_id = 1


class TaskBulkDelete(BaseModel):
    ids: List[int]


@app.get("/")
def read_index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/tasks")
def get_tasks():
    return tasks


@app.post("/api/tasks", response_model=Task)
def add_task(payload: TaskCreate):
    global next_id
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    task = Task(id=next_id, title=title)
    next_id += 1
    tasks.append(task)
    return task


@app.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, payload: TaskCreate):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    for index, task in enumerate(tasks):
        if task.id == task_id:
            updated = Task(id=task.id, title=title)
            tasks[index] = updated
            return updated
    raise HTTPException(status_code=404, detail="Task not found")


@app.post("/api/tasks/{task_id}/update", response_model=Task)
def update_task_alt(task_id: int, payload: TaskCreate):
    return update_task(task_id, payload)


@app.delete("/api/tasks/{task_id}", response_model=Task)
def delete_task(task_id: int):
    for index, task in enumerate(tasks):
        if task.id == task_id:
            return tasks.pop(index)
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/api/tasks", response_model=List[Task])
def delete_tasks_bulk(payload: Optional[TaskBulkDelete] = None):
    if not payload or not payload.ids:
        raise HTTPException(status_code=400, detail="Ids are required")
    id_set = set(payload.ids)
    deleted = []
    remaining = []
    for task in tasks:
        if task.id in id_set:
            deleted.append(task)
        else:
            remaining.append(task)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tasks not found")
    tasks.clear()
    tasks.extend(remaining)
    return deleted


@app.post("/api/tasks/bulk-delete", response_model=List[Task])
def delete_tasks_bulk_post(payload: Optional[TaskBulkDelete] = None):
    return delete_tasks_bulk(payload)
