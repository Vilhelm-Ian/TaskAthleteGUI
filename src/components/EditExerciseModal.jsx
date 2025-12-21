import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { X, Loader2, AlertTriangle, CheckSquare } from 'lucide-preact';

const EXERCISE_TYPES = [
  { value: 'Resistance', label: 'Resistance (Weights)' },
  { value: 'BodyWeight', label: 'Bodyweight' },
  { value: 'Cardio', label: 'Cardio' },
];

const EditExerciseModal = ({ isOpen, onClose, exerciseToEdit, onExerciseUpdated }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    muscles: '',
    reps: false,
    weight: false,
    duration: false,
    distance: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && exerciseToEdit) {
      setFormData({
        name: exerciseToEdit.name,
        type: exerciseToEdit.type_,
        muscles: exerciseToEdit.muscles || '',
        reps: exerciseToEdit.log_reps,
        weight: exerciseToEdit.log_weight,
        duration: exerciseToEdit.log_duration,
        distance: exerciseToEdit.log_distance,
      });
      setError(null);
    }
  }, [isOpen, exerciseToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await invoke('edit_exercise', {
        identifier: exerciseToEdit.name,
        newName: formData.name,
        newTypeStr: formData.type,
        newMuscles: formData.muscles ? formData.muscles : null,
        logReps: formData.reps,
        logWeight: formData.weight,
        logDuration: formData.duration,
        logDistance: formData.distance,
      });
      onExerciseUpdated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update exercise.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
      <div className="bg-surface rounded-xl w-full max-w-md border border-subtle overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-subtle bg-app">
          <h2 className="text-xl font-semibold">Edit Exercise</h2>
          <button onClick={onClose} className="p-2 text-muted hover:text-default"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-accent-destructive/10 text-accent-destructive rounded-lg flex items-center text-sm"><AlertTriangle size={18} className="mr-2" />{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={formData.name} onInput={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 bg-surface border border-subtle rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2 bg-surface border border-subtle rounded-lg" required>
              {EXERCISE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Muscles (comma separated)</label>
            <input type="text" value={formData.muscles} onInput={e => setFormData({...formData, muscles: e.target.value})} className="w-full p-2 bg-surface border border-subtle rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {['reps', 'weight', 'duration', 'distance'].map(m => (
              <label key={m} className="flex items-center space-x-2 p-2 hover:bg-hover rounded-lg cursor-pointer">
                <input type="checkbox" checked={formData[m]} onChange={() => setFormData({...formData, [m]: !formData[m]})} className="accent-accent-emphasis" />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-strong rounded-lg">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm bg-accent-emphasis text-on-accent rounded-lg flex items-center">
              {isSubmitting && <Loader2 size={16} className="animate-spin mr-2" />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExerciseModal;
