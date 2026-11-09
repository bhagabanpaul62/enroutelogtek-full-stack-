'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createLoadApi, getLoadApi, updateLoadApi } from '../api/loads.api';
import { WIZARD_STEPS } from '../constants';

const LAST_STEP = WIZARD_STEPS.length;
const clampStep = (step) => Math.min(Math.max(Number(step) || 1, 1), LAST_STEP);

const loadErrorMessage = (error) =>
    error.response?.status === 404
        ? 'This load does not exist or belongs to another company.'
        : error.response?.data?.message || 'Could not load the draft. Please try again.';

/** The 422 `error` map (field → message) without its empty entries. */
const fieldErrorsOf = (error) =>
    Object.fromEntries(
        Object.entries(error.response?.data?.error ?? {}).filter(([, message]) => Boolean(message)),
    );

/**
 * Draft lifecycle for the New Ad Hoc load wizard.
 * - With a loadId (?id=): fetches the draft and opens at its lastStep.
 * - Without one: the first saveStep() creates the draft (POST) and rewrites the URL to ?id=<id>.
 * - Every later saveStep() PATCHes that step's fields plus lastStep = the step to open next.
 * - goTo() only moves between steps; Back and the step rail never save.
 * @param {string|null} loadId the ?id= from the URL, or null for a new load
 */
export function useLoadDraft(loadId) {
    const router = useRouter();
    const pathname = usePathname();

    // `loadedId` says which load the stored answer belongs to. `createdId` bridges the moment
    // between the POST and the URL catching up with ?id=, so the wizard never flashes empty.
    const [state, setState] = useState({ load: null, error: '', loadedId: null });
    const [createdId, setCreatedId] = useState(null);
    const [stepOverride, setStepOverride] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const activeId = loadId || createdId || null;
    const isCurrent = Boolean(activeId) && state.loadedId === activeId;

    useEffect(() => {
        if (!activeId || state.loadedId === activeId) return undefined;
        let ignore = false;
        getLoadApi(activeId)
            .then(({ data }) => {
                if (!ignore) setState({ load: data.data, error: '', loadedId: activeId });
            })
            .catch((error) => {
                if (!ignore) setState({ load: null, error: loadErrorMessage(error), loadedId: activeId });
            });
        return () => {
            ignore = true;
        };
    }, [activeId, state.loadedId]);

    const load = isCurrent ? state.load : null;
    const step = stepOverride ?? clampStep(load?.lastStep ?? 1);

    // Forget the stored answer so the effect fetches the load again (after a 409, for example).
    const reload = () => setState((prev) => ({ ...prev, loadedId: null }));

    /**
     * Saves one step's fields and opens `nextStep` when the server accepts them.
     * @returns {Promise<boolean>} true when saved; false when the server refused (message shown)
     */
    const saveStep = async (fields, nextStep) => {
        setSaving(true);
        setSaveError('');
        setFieldErrors({});
        try {
            const body = { ...fields, lastStep: clampStep(nextStep) };
            const { data } = load ? await updateLoadApi(load.id, body) : await createLoadApi(body);
            const saved = data.data;
            setState({ load: saved, error: '', loadedId: saved.id });
            setStepOverride(clampStep(nextStep));
            if (!load) {
                setCreatedId(saved.id);
                router.replace(`${pathname}?id=${saved.id}`, { scroll: false });
            }
            return true;
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || 'Could not save the draft. Please try again.';
            if (status === 409) {
                // Not a draft any more (published or cancelled elsewhere): fetch it again so the
                // wizard can send the user to the load's page.
                toast.error(message);
                reload();
                return false;
            }
            setSaveError(message);
            setFieldErrors(fieldErrorsOf(error));
            if (status !== 422) toast.error(message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        load,
        isLoading: Boolean(activeId) && !isCurrent,
        error: isCurrent ? state.error : '',
        reload,
        step,
        goTo: (next) => setStepOverride(clampStep(next)),
        saving,
        saveError,
        fieldErrors,
        saveStep,
    };
}
