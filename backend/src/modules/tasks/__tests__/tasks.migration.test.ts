import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(`../../../../migrations/${file}`, import.meta.url), 'utf8');
const projects = read('019_projects.sql');
const members = read('020_project_members.sql');
const tasks = read('021_tasks.sql');
const assignees = read('022_task_assignees.sql');

describe('tasks migrations', () => {
  it('every foreign key has the ON DELETE rule from the spec', () => {
    expect(members).toMatch(/FOREIGN KEY \(project_id\) REFERENCES projects \(id\) ON DELETE CASCADE/);
    expect(members).toMatch(/FOREIGN KEY \(user_id\) REFERENCES users \(id\) ON DELETE CASCADE/);
    expect(tasks).toMatch(/FOREIGN KEY \(project_id\) REFERENCES projects \(id\) ON DELETE CASCADE/);
    expect(tasks).toMatch(/FOREIGN KEY \(created_by\) REFERENCES users \(id\) ON DELETE SET NULL/);
    expect(tasks).toMatch(/FOREIGN KEY \(archived_by\) REFERENCES users \(id\) ON DELETE SET NULL/);
    expect(tasks).toMatch(/created_by_name VARCHAR\(141\) NOT NULL/);
    expect(assignees).toMatch(/FOREIGN KEY \(task_id\) REFERENCES tasks \(id\) ON DELETE CASCADE/);
    expect(assignees).toMatch(/FOREIGN KEY \(user_id\) REFERENCES users \(id\) ON DELETE CASCADE/);
  });

  it('project name is unique and 60 characters long', () => {
    expect(projects).toMatch(/name VARCHAR\(60\) NOT NULL/);
    expect(projects).toMatch(/UNIQUE KEY uq_projects_name \(name\)/);
  });

  it('column_key is an enum of three columns, title and description match the limits', () => {
    expect(tasks).toContain("column_key ENUM('draft','in_progress','done') NOT NULL");
    expect(tasks).toMatch(/title VARCHAR\(150\) NOT NULL/);
    expect(tasks).toMatch(/description TEXT NULL/);
    expect(tasks).toMatch(/due_date DATE NULL/);
  });

  it('board index on project, archived, column, position', () => {
    expect(tasks).toMatch(/INDEX idx_tasks_board \(project_id, archived_at, column_key, position\)/);
  });

  it('one table per migration, composite primary keys for the link tables', () => {
    for (const sql of [projects, members, tasks, assignees]) expect(sql.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(members).toMatch(/PRIMARY KEY \(project_id, user_id\)/);
    expect(assignees).toMatch(/PRIMARY KEY \(task_id, user_id\)/);
  });

  it('023 adds the finished marker to tasks, one change only', () => {
    const finished = read('023_tasks_finished.sql');
    expect(finished).toMatch(/ALTER TABLE tasks ADD COLUMN finished_at DATETIME NULL/);
    expect(finished.match(/ALTER TABLE/g)).toHaveLength(1);
  });
});
