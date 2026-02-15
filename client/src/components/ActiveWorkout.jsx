import React, { useState } from 'react';
import { Timer, CheckCircle, Save } from 'lucide-react';

// Componente de una fila de Set
const SetRow = ({ setNum, prevData, onUpdate }) => {
    const [done, setDone] = useState(false);
    const [weight, setWeight] = useState(prevData?.weight || '');
    const [reps, setReps] = useState(prevData?.reps || '');

    const handleCheck = () => {
        setDone(!done);
        onUpdate({ setNum, weight, reps, completed: !done });
    };

    return (
        <div className={`grid grid-cols-4 gap-2 mb-2 items-center p-2 rounded ${done ? 'bg-green-900/30' : 'bg-surface'}`}>
            <span className="text-center text-gray-400 font-bold">#{setNum}</span>
            <input
                type="number" placeholder="kg" value={weight} onChange={e => setWeight(e.target.value)}
                className="bg-background p-1 rounded text-center border border-gray-700"
            />
            <input
                type="number" placeholder="reps" value={reps} onChange={e => setReps(e.target.value)}
                className="bg-background p-1 rounded text-center border border-gray-700"
            />
            <button onClick={handleCheck} className={`flex justify-center ${done ? 'text-green-500' : 'text-gray-500'}`}>
                <CheckCircle size={24} />
            </button>
        </div>
    );
};

export default function ActiveWorkout({ dayData, onFinish }) {
    // Estado local para acumular datos antes de enviar
    const [workoutData, setWorkoutData] = useState({});

    const handleSetUpdate = (exerciseName, data) => {
        setWorkoutData(prev => ({
            ...prev,
            [exerciseName]: {
                ...prev[exerciseName],
                [data.setNum]: data
            }
        }));
    };

    const handleSave = async () => {
        // Aplanar datos para el backend
        const setsToSave = [];
        Object.keys(workoutData).forEach(exName => {
            Object.values(workoutData[exName]).forEach(set => {
                setsToSave.push({
                    exercise_name: exName,
                    set_number: set.setNum,
                    weight: set.weight,
                    reps: set.reps,
                    is_completed: set.completed
                });
            });
        });

        // POST al backend
        await fetch('http://localhost:3001/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day_id: dayData.id, notes: '', sets: setsToSave })
        });

        alert('Entrenamiento guardado!');
        onFinish();
    };

    return (
        <div className="max-w-md mx-auto p-4 pb-20">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-primary">{dayData.name}</h1>
                    <p className="text-sm text-gray-400">En progreso...</p>
                </div>
                <div className="bg-surface p-2 rounded-full">
                    <Timer className="text-accent" />
                </div>
            </header>

            <div className="space-y-6">
                {dayData.exercises.map((ex) => (
                    <div key={ex.id} className="bg-surface/50 p-4 rounded-xl border border-gray-800">
                        <div className="flex justify-between mb-3">
                            <h3 className="font-semibold text-lg">{ex.name}</h3>
                            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                Meta: {ex.target_sets} x {ex.target_reps}
                            </span>
                        </div>

                        {/* Renderizar filas según target_sets */}
                        {[...Array(ex.target_sets)].map((_, i) => (
                            <SetRow
                                key={i}
                                setNum={i + 1}
                                onUpdate={(data) => handleSetUpdate(ex.name, data)}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <button
                onClick={handleSave}
                className="fixed bottom-4 right-4 left-4 bg-primary hover:bg-blue-600 text-white p-4 rounded-lg font-bold shadow-lg flex justify-center items-center gap-2"
            >
                <Save size={20} /> Terminar Sesión
            </button>
        </div>
    );
}