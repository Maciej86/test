import { useState } from 'react';
import {
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { BoardTask, TaskColumn } from '@app/shared';
import { moveInBoard } from '../boardMove';
import { dragOverTarget, dropTarget, overColumn, placementOf, preferCards } from './boardDrop';

/** Cel przeciągania: to, co jest pod kursorem (karta przed kolumną); poza kolumnami najbliższe po powierzchni. */
const collisionDetection: CollisionDetection = (args) => {
  const under = pointerWithin(args);
  return under.length > 0 ? preferCards(under) : rectIntersection(args);
};

/**
 * Przeciąganie kart na tablicy. W trakcie przeciągania tablica pracuje na własnej kopii (odświeżenia z serwera nie
 * przesuwają karty spod palca), karta przeskakuje tylko do innej kolumny, a miejsce w kolumnie ustala upuszczenie.
 * `onMove` dostaje kartę i jej nowe miejsce, gdy się zmieniło.
 */
export const useBoardDrag = (tasks: BoardTask[], onMove: (task: BoardTask, column: TaskColumn, beforeTaskId: number | null) => void) => {
  const [dragTasks, setDragTasks] = useState<BoardTask[] | null>(null);
  // Kolumna, do której trafi przeciągana karta (podświetlona ramka).
  const [targetColumn, setTargetColumn] = useState<TaskColumn | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  // Ułożenie po upuszczeniu, ważne dla tych danych tablicy (`base`), na których przeciąganie się zaczęło. Nowe dane
  // (zmiana od razu na ekranie po wysłaniu albo odpowiedź serwera) je zastępują, więc karta nie wraca na chwilę na
  // stare miejsce, a „duch” leci od razu do nowej kolumny.
  const [settled, setSettled] = useState<{ base: BoardTask[]; tasks: BoardTask[] } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const stop = () => {
    setDragTasks(null);
    setTargetColumn(null);
    setActiveId(null);
  };
  const onDragStart = ({ active }: DragStartEvent) => {
    setSettled(null);
    setDragTasks(tasks);
    setActiveId(Number(active.id));
  };
  const onDragOver = ({ active, over }: DragOverEvent) => {
    setTargetColumn(over && dragTasks ? overColumn(dragTasks, over.id) : null);
    if (!over) return;
    // Na najświeższym stanie: kilka zdarzeń w jednej klatce nie pracuje na nieaktualnej kopii.
    setDragTasks((current) => {
      if (!current) return current;
      const target = dragOverTarget(current, Number(active.id), over.id);
      return target ? moveInBoard(current, Number(active.id), target) : current;
    });
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id);
    const task = tasks.find((x) => x.id === id);
    if (dragTasks && task) {
      const before = placementOf(tasks, id);
      const after = over ? dropTarget(dragTasks, id, over.id) : placementOf(dragTasks, id);
      if (before.column !== after.column || before.beforeTaskId !== after.beforeTaskId) {
        setSettled({ base: tasks, tasks: moveInBoard(dragTasks, id, after) });
        onMove(task, after.column, after.beforeTaskId);
      }
    }
    stop();
  };

  return {
    /** Karty do pokazania: kopia w trakcie przeciągania, inaczej z serwera. */
    tasks: dragTasks ?? (settled && settled.base === tasks ? settled.tasks : tasks),
    targetColumn,
    activeTask: activeId === null ? null : (tasks.find((task) => task.id === activeId) ?? null),
    /** Serwer odrzucił przeniesienie: wraca ułożenie z danych tablicy. */
    reset: () => setSettled(null),
    context: { sensors, collisionDetection, onDragStart, onDragOver, onDragEnd, onDragCancel: stop },
  };
};
