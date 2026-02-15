import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, Play, ChevronDown, ChevronRight, X } from 'lucide-react';

// --- COMPONENTE MODAL (Sin cambios) ---
const ExerciseModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '', target_sets: 3, target_reps: '8-12', target_rpe: 8, notes: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        setFormData({ name: '', target_sets: 3, target_reps: '8-12', target_rpe: 8, notes: '' });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-surface border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Agregar Ejercicio</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                        <input
                            required autoFocus
                            className="w-full bg-background border border-gray-700 rounded p-2 text-white focus:border-primary outline-none"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Sentadilla Barra Baja"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Sets</label>
                            <input type="number" className="w-full bg-background border border-gray-700 rounded p-2 text-white"
                                value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Reps Objetivo</label>
                            <input className="w-full bg-background border border-gray-700 rounded p-2 text-white"
                                value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">RPE / Intensidad</label>
                            <input type="number" step="0.5" className="w-full bg-background border border-gray-700 rounded p-2 text-white"
                                value={formData.target_rpe} onChange={e => setFormData({ ...formData, target_rpe: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Notas</label>
                        <input className="w-full bg-background border border-gray-700 rounded p-2 text-white"
                            value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-3 rounded-lg font-bold mt-4">
                        Guardar Ejercicio
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProgramDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estado para controlar qué semanas están expandidas { [weekId]: boolean }
    const [expandedWeeks, setExpandedWeeks] = useState({});

    const [modalOpen, setModalOpen] = useState(false);
    const [activeDayIdForExercise, setActiveDayIdForExercise] = useState(null);

    const fetchProgram = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/programs/${id}/full`);
            if (!res.ok) throw new Error('Error fetching');
            const data = await res.json();
            setProgram(data);

            // Opcional: Expandir automáticamente la última semana agregada o la primera
            // Si quieres que todas empiecen cerradas, elimina estas líneas.
            if (data.weeks.length > 0) {
                const lastWeekId = data.weeks[data.weeks.length - 1].id;
                setExpandedWeeks(prev => ({ ...prev, [lastWeekId]: true }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProgram(); }, [id]);

    // --- ACTIONS ---

    const toggleWeek = (weekId) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekId]: !prev[weekId]
        }));
    };

    const addWeek = async () => {
        const nextWeekNum = program.weeks.length + 1;
        const res = await fetch('http://localhost:3001/api/weeks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ program_id: id, week_number: nextWeekNum })
        });
        const data = await res.json();

        // Recargar y expandir la nueva semana automáticamente
        await fetchProgram();
        setExpandedWeeks(prev => ({ ...prev, [data.id]: true }));
    };

    const deleteWeek = async (weekId, e) => {
        e.stopPropagation(); // Evitar que se colapse/expanda al borrar
        if (!confirm("¿Estás seguro de eliminar esta semana y todo su contenido?")) return;
        await fetch(`http://localhost:3001/api/weeks/${weekId}`, { method: 'DELETE' });
        fetchProgram();
    };

    const addDay = async (weekId, currentDaysCount, e) => {
        e.stopPropagation(); // Evitar colapso
        const name = prompt("Nombre del día (ej: Pierna, Lunes):");
        if (!name) return;

        await fetch('http://localhost:3001/api/days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ week_id: weekId, name, day_order: currentDaysCount + 1 })
        });
        fetchProgram();
    };

    const openAddExercise = (dayId) => {
        setActiveDayIdForExercise(dayId);
        setModalOpen(true);
    };

    const saveExercise = async (formData) => {
        await fetch('http://localhost:3001/api/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day_id: activeDayIdForExercise,
                ...formData,
                exercise_order: 99
            })
        });
        setModalOpen(false);
        fetchProgram();
    };

    const deleteExercise = async (exId) => {
        if (!confirm("¿Borrar ejercicio?")) return;
        await fetch(`http://localhost:3001/api/exercises/${exId}`, { method: 'DELETE' });
        fetchProgram();
    };

    const startWorkout = (dayId) => {
        navigate(`/workout/${dayId}`);
    };

    if (loading) return <div className="p-10 text-center">Cargando...</div>;
    if (!program) return <div className="p-10 text-center">No encontrado</div>;

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/programs" className="p-2 bg-surface rounded-full hover:bg-gray-700 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">{program.name}</h1>
                    <p className="text-gray-400">{program.description}</p>
                </div>
            </div>

            <div className="space-y-4">
                {program.weeks.length === 0 && (
                    <div className="text-center p-10 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 mb-4">No hay semanas configuradas</p>
                        <button onClick={addWeek} className="bg-primary px-4 py-2 rounded-lg text-white font-medium">
                            Agregar Semana 1
                        </button>
                    </div>
                )}

                {program.weeks.map((week) => {
                    const isExpanded = expandedWeeks[week.id];

                    return (
                        <div key={week.id} className="bg-surface/50 border border-gray-800 rounded-xl overflow-hidden transition-all">
                            {/* HEADER DE LA SEMANA (Clickable para expandir/colapsar) */}
                            <div
                                onClick={() => toggleWeek(week.id)}
                                className="bg-surface p-4 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors select-none"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown size={20} className="text-primary" /> : <ChevronRight size={20} className="text-gray-500" />}
                                    <h2 className={`font-bold text-lg flex items-center gap-2 ${isExpanded ? 'text-white' : 'text-gray-400'}`}>
                                        <Calendar size={18} /> Semana {week.week_number}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => addDay(week.id, week.days.length, e)}
                                        className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-md text-gray-300 flex items-center gap-1 transition-colors z-10"
                                    >
                                        <Plus size={14} /> Día
                                    </button>
                                    <button
                                        onClick={(e) => deleteWeek(week.id, e)}
                                        className="text-gray-500 hover:text-red-500 p-2 rounded hover:bg-gray-800/50 transition-colors z-10"
                                        title="Borrar Semana"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* CONTENIDO DE LA SEMANA (Solo visible si isExpanded es true) */}
                            {isExpanded && (
                                <div className="p-4 space-y-4 border-t border-gray-800 bg-black/20 animate-fade-in">
                                    {week.days.length === 0 && <p className="text-sm text-gray-500 italic pl-2">Sin días asignados. Agrega uno arriba.</p>}

                                    {week.days.map((day) => (
                                        <div key={day.id} className="bg-background rounded-lg border border-gray-800 p-4 relative group/day">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                                    <div className="w-1 h-6 bg-accent rounded-full"></div>
                                                    {day.name}
                                                </h3>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openAddExercise(day.id)}
                                                        className="text-xs border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        + Ejercicio
                                                    </button>
                                                    <button
                                                        onClick={() => startWorkout(day.id)}
                                                        className="flex items-center gap-1 text-xs bg-primary hover:bg-blue-600 text-white px-3 py-1.5 rounded font-bold shadow-lg shadow-blue-900/20 transition-all"
                                                    >
                                                        <Play size={12} fill="currentColor" /> ENTRENAR
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {day.exercises.map((ex, index) => (
                                                    <div key={ex.id} className="flex justify-between items-center bg-surface p-3 rounded hover:bg-gray-800 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-gray-500 font-mono font-bold text-lg w-6">{index + 1}.</span>
                                                            <div>
                                                                <p className="font-medium text-gray-200">{ex.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {ex.target_sets} x {ex.target_reps} {ex.target_rpe && `@ RPE ${ex.target_rpe}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => deleteExercise(ex.id)}
                                                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {day.exercises.length === 0 && (
                                                    <div className="text-center py-4 text-sm text-gray-600 border border-dashed border-gray-800 rounded">
                                                        Día vacío
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {program.weeks.length > 0 && (
                <button
                    onClick={addWeek}
                    className="mt-6 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl hover:border-primary hover:text-primary transition-colors flex justify-center items-center gap-2 font-medium"
                >
                    <Plus size={20} /> Agregar Siguiente Semana
                </button>
            )}

            <ExerciseModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={saveExercise}
            />
        </div>
    );
}