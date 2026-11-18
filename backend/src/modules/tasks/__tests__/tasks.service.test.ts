import { describe, it } from 'vitest';

describe('tasks service', () => {
  it.todo('project list filtered by membership in SQL');
  it.todo('project_added notification for new members only');
  it.todo('removed member leaves open tasks of the project only');
  it.todo('delete project counts all tasks including archived');
  it.todo('addMemberWhereAssigned adds the person to projects with open tasks');
  it.todo('board people include archived assignees');
  it.todo('new task goes to the top of its column');
  it.todo('author comes from the actor, not the request');
  it.todo('task_assigned only for newly assigned people other than the author');
  it.todo('column change via edit puts the card on top and sets or clears completed_at');
  it.todo('move renumbers the column without gaps under a lock');
  it.todo('history entries for create, update, status and archive');
});
