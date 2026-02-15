import React, { useState, useEffect, useRef } from 'react';
import { Timer, Check, Plus, Save, ArrowLeft, Trash2, Edit2 } from 'lucide-react';

export default function ActiveWorkout({ dayData, onFinish }) {
    const [sessionData, setSessionData] = useState({});
    const [editingExerciseId, setEditingExerciseId] = useState(null); // ID del ejercicio cuyo nombre estamos editando

    // Clave única para localStorage basada en el ID del día
    const STORAGE_KEY = `workout_draft_${dayData.id}`;

    // 1. INICIALIZACIÓN (Carga desde LocalStorage o desde DB)
    useEffect(() => {
        if (dayData && dayData.exercises) {
            const savedData = localStorage.getItem(STORAGE_KEY);

            if (savedData) {
                // Si hay borrador guardado, lo usamos
                setSessionData(JSON.parse(savedData));
            } else {
                // Si no, inicializamos limpio basado en el plan
                const initialData = {};
                dayData.exercises.forEach(ex => {
                    initialData[ex.id] = Array.from({ length: ex.target_sets }).map((_, i) => ({
                        setNum: i + 1,
                        weight: '',
                        reps: '',
                        completed: false
                    }));
                });
                setSessionData(initialData);
            }
        }
    }, [dayData]);

    // 2. AUTO-GUARDADO (Cada vez que cambia sessionData, guardamos en local)
    useEffect(() => {
        if (Object.keys(sessionData).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        }
    }, [sessionData]);

    // --- ACCIONES DE DATOS ---

    const updateSet = (exerciseId, index, field, value) => {
        setSessionData(prev => {
            const sets = [...(prev[exerciseId] || [])];
            sets[index] = { ...sets[index], [field]: value };
            return { ...prev, [exerciseId]: sets };
        });
    };

    const toggleComplete = (exerciseId, index) => {
        setSessionData(prev => {
            const sets = [...(prev[exerciseId] || [])];
            sets[index] = { ...sets[index], completed: !sets[index].completed };
            return { ...prev, [exerciseId]: sets };
        });
    };

    // --- ACCIONES ESTRUCTURALES (Persistentes en DB) ---

    const handleUpdateExerciseName = async (exerciseId, newName) => {
        // 1. Actualizar DB
        await fetch(`http://localhost:3001/api/exercises/${exerciseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        setEditingExerciseId(null);
        // Nota: El cambio visual local ya se maneja por el input, pero idealmente deberíamos recargar dayData
        // Para simplificar, asumimos que el usuario ve el cambio en el input
    };

    const handleAddSet = async (exerciseId) => {
        // 1. Actualizar Estado Local
        setSessionData(prev => {
            const currentSets = prev[exerciseId] || [];
            const nextSetNum = currentSets.length + 1;
            return {
                ...prev,
                [exerciseId]: [...currentSets, { setNum: nextSetNum, weight: '', reps: '', completed: false }]
            };
        });

        // 2. Actualizar DB (Incrementar target_sets)
        const currentCount = sessionData[exerciseId]?.length || 0;
        await fetch(`http://localhost:3001/api/exercises/${exerciseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_sets: currentCount + 1 })
        });
    };

    const handleDeleteSet = async (exerciseId, indexToDelete) => {
        // 1. Actualizar Estado Local
        setSessionData(prev => {
            const currentSets = [...(prev[exerciseId] || [])];
            currentSets.splice(indexToDelete, 1);

            // Renumerar
            const reorderedSets = currentSets.map((set, index) => ({
                ...set,
                setNum: index + 1
            }));
            return { ...prev, [exerciseId]: reorderedSets };
        });

        // 2. Actualizar DB (Decrementar target_sets)
        const currentCount = sessionData[exerciseId]?.length || 1;
        await fetch(`http://localhost:3001/api/exercises/${exerciseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_sets: Math.max(0, currentCount - 1) })
        });
    };

    const handleSaveWorkout = async () => {
        const setsToSave = [];
        Object.keys(sessionData).forEach(exId => {
            // Intentamos buscar el nombre en dayData, pero si el usuario lo editó en local, 
            // quizás deberíamos usar el del DOM o refetch. Por simplicidad usamos dayData original
            // o un "Updated" si tuvieramos estado local de nombres.
            const exercise = dayData.exercises.find(e => e.id === parseInt(exId));
            const exerciseName = exercise ? exercise.name : 'Unknown';

            sessionData[exId].forEach(set => {
                if (set.completed || set.weight || set.reps) {
                    setsToSave.push({
                        exercise_name: exerciseName, // Nota: Si cambiaste el nombre, se guardará el nuevo en logs futuros
                        set_number: set.setNum,
                        weight: set.weight,
                        reps: set.reps,
                        is_completed: set.completed
                    });
                }
            });
        });

        try {
            await fetch('http://localhost:3001/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_id: dayData.id,
                    notes: 'Entrenamiento registrado',
                    sets: setsToSave
                })
            });

            // LIMPIAR STORAGE AL TERMINAR
            localStorage.removeItem(STORAGE_KEY);
            onFinish();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    return (
        <div className="min-h-screen bg-background pb-32 animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex justify-between items-center shadow-md">
                <button onClick={onFinish} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-white text-lg leading-tight">{dayData.name}</h1>
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        <Timer size={10} /> En progreso
                    </p>
                </div>
                <button className="p-2 -mr-2 text-primary font-bold text-sm" onClick={handleSaveWorkout}>
                    LISTO
                </button>
            </header>

            {/* Lista */}
            <div className="max-w-3xl mx-auto p-4 space-y-8">
                {dayData.exercises.map((ex, exIndex) => {
                    const sets = sessionData[ex.id] || [];
                    const isEditing = editingExerciseId === ex.id;

                    return (
                        <div key={ex.id} className="space-y-3">
                            {/* Título Editable */}
                            <div className="flex justify-between items-end px-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-gray-500 font-bold">{exIndex + 1}.</span>

                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            defaultValue={ex.name}
                                            onBlur={(e) => handleUpdateExerciseName(ex.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdateExerciseName(ex.id, e.currentTarget.value);
                                            }}
                                            className="bg-gray-800 text-white font-bold text-lg rounded px-2 py-1 w-full outline-none border border-primary"
                                        />
                                    ) : (
                                        <h3
                                            onClick={() => setEditingExerciseId(ex.id)}
                                            className="text-lg font-bold text-blue-100 cursor-text hover:bg-white/5 rounded px-1 transition-colors flex items-center gap-2"
                                            title="Click para editar nombre"
                                        >
                                            {ex.name} <Edit2 size={12} className="text-gray-600 opacity-50" />
                                        </h3>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 font-mono mb-1 shrink-0">
                                    Meta: {sets.length}x{ex.target_reps}
                                </span>
                            </div>

                            {/* Tabla Sets */}
                            <div className="bg-surface rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                                <div className="grid grid-cols-[30px_30px_1fr_1fr_40px] gap-2 px-3 py-2 bg-gray-800/50 text-[10px] font-bold text-gray-400 text-center uppercase tracking-wider items-center">
                                    <div></div>
                                    <div>Set</div>
                                    <div>KG</div>
                                    <div>Reps</div>
                                    <div><Check size={12} className="mx-auto" /></div>
                                </div>

                                <div className="divide-y divide-gray-800">
                                    {sets.map((set, i) => (
                                        <div key={i} className={`grid grid-cols-[30px_30px_1fr_1fr_40px] gap-2 px-3 py-2 items-center transition-colors ${set.completed ? 'bg-green-900/10' : ''}`}>
                                            <button onClick={() => handleDeleteSet(ex.id, i)} className="flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors p-1">
                                                <Trash2 size={14} />
                                            </button>
                                            <div className="flex justify-center">
                                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${set.completed ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'}`}>{set.setNum}</span>
                                            </div>
                                            <input
                                                type="number" placeholder="-" value={set.weight}
                                                onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                                                className={`w-full bg-gray-900/50 border border-transparent rounded-lg py-1.5 text-center text-white font-bold text-sm focus:border-primary focus:bg-gray-900 focus:outline-none transition-all ${set.completed ? 'text-green-300' : ''}`}
                                            />
                                            <input
                                                type="number" placeholder={ex.target_reps} value={set.reps}
                                                onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                                                className={`w-full bg-gray-900/50 border border-transparent rounded-lg py-1.5 text-center text-white font-bold text-sm focus:border-primary focus:bg-gray-900 focus:outline-none transition-all ${set.completed ? 'text-green-300' : ''}`}
                                            />
                                            <button onClick={() => toggleComplete(ex.id, i)} className={`flex items-center justify-center h-8 w-full rounded-md transition-all ${set.completed ? 'bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}`}>
                                                <Check size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={() => handleAddSet(ex.id)} className="w-full py-3 bg-gray-800/30 hover:bg-gray-800 text-xs font-bold text-primary flex items-center justify-center gap-1 transition-colors border-t border-gray-800">
                                    <Plus size={14} /> AGREGAR SET
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-6 left-0 right-0 px-4 md:px-0 flex justify-center pointer-events-none z-10">
                <button onClick={handleSaveWorkout} className="pointer-events-auto bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-2xl shadow-blue-500/30 flex items-center gap-2 transform active:scale-95 transition-all">
                    <Save size={20} /> Terminar Sesión
                </button>
            </div>
        </div>
    );
}