import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { adminApi } from '../services/adminApi';
import { requestApi } from '@/features/requests/services/requestApi';
import type {
  AdminDonationRequestItem,
  AdminDonationRequestDetail,
  AdminDonationStatusFilter,
  AdminDonationRequestsPagination,
  CreateDonationRequestPayload,
  UpdateDonationRequestPayload,
  AdminDonorResponseItem,
} from '../types';
import type { HospitalOption } from '@/features/requests/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const URGENCIES = ['Urgent', 'Scheduled'] as const;

const FALLBACK_HOSPITALS: HospitalOption[] = [
  { id: 'hosp-colombo-city', name: 'City Hospital, Colombo', district: 'Colombo' },
  { id: 'hosp-nbts-narahenpita', name: 'National Blood Transfusion Service, Narahenpita', district: 'Colombo' },
  { id: 'hosp-cnh-colombo', name: 'Colombo National Hospital Blood Bank', district: 'Colombo' },
  { id: 'hosp-sjh-kotte', name: 'Sri Jayewardenepura General Hospital', district: 'Colombo' },
  { id: 'hosp-kandy-gen', name: 'Kandy National Hospital', district: 'Kandy' },
  { id: 'hosp-karapitiya-galle', name: 'Karapitiya Teaching Hospital, Galle', district: 'Galle' },
];

export const SAMPLE_PREVIEW_DONATION_REQUESTS: AdminDonationRequestDetail[] = [
  {
    id: 'dreq_prev_01',
    bloodGroup: 'O-',
    unitsRequired: 5,
    hospitalId: 'hosp-nbts-narahenpita',
    hospitalName: 'National Blood Transfusion Service, Narahenpita',
    locationDescription: 'Main Blood Bank, 1st Floor Reception',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'published',
    publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    closedAt: null,
    responseCount: 3,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdByAdmin: {
      id: 'admin_prev',
      name: 'Dr. Test Administrator',
      email: 'admin@lifeline.lk',
    },
  },
  {
    id: 'dreq_prev_02',
    bloodGroup: 'B+',
    unitsRequired: 2,
    hospitalId: 'hosp-colombo-city',
    hospitalName: 'City Hospital, Colombo',
    locationDescription: 'Emergency Ward Triage Station',
    urgency: 'Scheduled',
    neededBy: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'draft',
    publishedAt: null,
    closedAt: null,
    responseCount: 0,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdByAdmin: {
      id: 'admin_prev',
      name: 'Dr. Test Administrator',
      email: 'admin@lifeline.lk',
    },
  },
  {
    id: 'dreq_prev_03',
    bloodGroup: 'A+',
    unitsRequired: 4,
    hospitalId: 'hosp-cnh-colombo',
    hospitalName: 'Colombo National Hospital Blood Bank',
    locationDescription: 'Surgical ICU Wing B',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() - 86400000).toISOString(),
    status: 'closed',
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    closedAt: new Date(Date.now() - 86400000).toISOString(),
    responseCount: 4,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    createdByAdmin: {
      id: 'admin_prev',
      name: 'Dr. Test Administrator',
      email: 'admin@lifeline.lk',
    },
  },
];

export const SAMPLE_PREVIEW_DONOR_RESPONSES: AdminDonorResponseItem[] = [
  {
    responseId: 'resp_prev_01',
    donorId: 'donor_01',
    donorName: 'Nuwan Jayasinghe',
    donorBloodGroup: 'O-',
    donorDistrict: 'Colombo',
    status: 'willing_to_donate',
    acceptedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    responseId: 'resp_prev_02',
    donorId: 'donor_02',
    donorName: 'Dilani Fernando',
    donorBloodGroup: 'O-',
    donorDistrict: 'Gampaha',
    status: 'willing_to_donate',
    acceptedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    responseId: 'resp_prev_03',
    donorId: 'donor_03',
    donorName: 'Kasun Wickramasinghe',
    donorBloodGroup: 'O-',
    donorDistrict: 'Colombo',
    status: 'willing_to_donate',
    acceptedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function AdminDonationRequestsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user, token } = useAuth();
  const isPreview = !token || token === 'demo-jwt-token' || user?.role !== 'admin';

  // Filters and pagination state
  const [statusFilter, setStatusFilter] = useState<AdminDonationStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Requests list state
  const [requests, setRequests] = useState<AdminDonationRequestItem[]>([]);
  const [pagination, setPagination] = useState<AdminDonationRequestsPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [counts, setCounts] = useState({ draft: 0, published: 0, closed: 0 });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Selected Detail state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const selectedRequestIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);

  const [selectedDetail, setSelectedDetail] = useState<AdminDonationRequestDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Donor Responses state (for selected request)
  const [donorResponses, setDonorResponses] = useState<AdminDonorResponseItem[]>([]);
  const [responsesPagination, setResponsesPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);

  // Create / Edit Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formBloodGroup, setFormBloodGroup] = useState<string>('O+');
  const [formUnits, setFormUnits] = useState('2');
  const [formHospitalId, setFormHospitalId] = useState<string>('hosp-nbts-narahenpita');
  const [formLocation, setFormLocation] = useState('');
  const [formUrgency, setFormUrgency] = useState<'Urgent' | 'Scheduled'>('Urgent');
  const [formNeededByPreset, setFormNeededByPreset] = useState<'none' | '24h' | '3d' | '7d'>('none');
  const [formNeededByDate, setFormNeededByDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Hospital Catalogue
  const [hospitals, setHospitals] = useState<HospitalOption[]>(FALLBACK_HOSPITALS);

  // Publish & Close Modal states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Post-mutation refresh notice state
  const [postMutationRefreshError, setPostMutationRefreshError] = useState<{
    message: string;
    onRetry: () => void;
  } | null>(null);

  // Sequence refs to avoid race conditions
  const listSeqRef = useRef(0);
  const detailSeqRef = useRef(0);
  const responsesSeqRef = useRef(0);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load hospitals catalogue on mount
  useEffect(() => {
    let mounted = true;
    requestApi
      .getHospitals()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setHospitals(data);
          setFormHospitalId((prev) => prev || data[0]!.id);
        }
      })
      .catch((err) => {
        console.log('[admin-donation-req] Using fallback hospitals:', err?.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Requests List
  const fetchList = useCallback(
    async (isManualRefresh = false): Promise<boolean> => {
      const currentSeq = ++listSeqRef.current;

      if (isPreview) {
        setIsLoadingList(false);
        let filtered = [...SAMPLE_PREVIEW_DONATION_REQUESTS];
        if (statusFilter !== 'all') {
          filtered = filtered.filter((r) => r.status === statusFilter);
        }
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.id.toLowerCase().includes(q) ||
              r.hospitalName.toLowerCase().includes(q) ||
              r.locationDescription.toLowerCase().includes(q) ||
              r.bloodGroup.toLowerCase().includes(q),
          );
        }
        setRequests(filtered);
        setPagination({
          page: 1,
          limit: 10,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / 10) || 1,
          hasNextPage: false,
        });
        setCounts({
          draft: SAMPLE_PREVIEW_DONATION_REQUESTS.filter((r) => r.status === 'draft').length,
          published: SAMPLE_PREVIEW_DONATION_REQUESTS.filter((r) => r.status === 'published').length,
          closed: SAMPLE_PREVIEW_DONATION_REQUESTS.filter((r) => r.status === 'closed').length,
        });
        return true;
      }

      if (!token || user?.role !== 'admin') {
        setIsLoadingList(false);
        setListError('Administrative credentials required.');
        return false;
      }

      if (!isManualRefresh) {
        setIsLoadingList(true);
      }
      setListError(null);

      try {
        const response = await adminApi.getDonationRequests(token, {
          search: debouncedSearch,
          status: statusFilter,
          page,
          limit,
        });

        if (currentSeq !== listSeqRef.current) return false;

        setRequests(response.requests);
        setPagination(response.pagination);
        setCounts(response.counts);
        return true;
      } catch (err: any) {
        if (currentSeq !== listSeqRef.current) return false;
        setListError(err?.message || 'Failed to load donation requests.');
        return false;
      } finally {
        if (currentSeq === listSeqRef.current) {
          setIsLoadingList(false);
        }
      }
    },
    [isPreview, token, user?.role, debouncedSearch, statusFilter, page, limit],
  );

  // Trigger list fetch when filter/page changes or screen focuses
  useFocusEffect(
    useCallback(() => {
      void fetchList();
    }, [fetchList]),
  );

  // Fetch Donor Responses for the selected request
  const fetchResponses = useCallback(
    async (requestId: string, targetPage = 1) => {
      const currentSeq = ++responsesSeqRef.current;
      setIsLoadingResponses(true);
      setResponsesError(null);

      if (isPreview) {
        setIsLoadingResponses(false);
        setDonorResponses(SAMPLE_PREVIEW_DONOR_RESPONSES);
        setResponsesPagination({
          page: 1,
          limit: 10,
          total: SAMPLE_PREVIEW_DONOR_RESPONSES.length,
          totalPages: 1,
          hasNextPage: false,
        });
        return;
      }

      if (!token) {
        setIsLoadingResponses(false);
        return;
      }

      try {
        const res = await adminApi.getDonationRequestResponses(token, requestId, {
          page: targetPage,
          limit: 10,
        });
        if (currentSeq !== responsesSeqRef.current) return;
        setDonorResponses(res.responses);
        setResponsesPagination(res.pagination);
      } catch (err: any) {
        if (currentSeq !== responsesSeqRef.current) return;
        setResponsesError(err?.message || 'Failed to load donor responses.');
      } finally {
        if (currentSeq === responsesSeqRef.current) {
          setIsLoadingResponses(false);
        }
      }
    },
    [isPreview, token],
  );

  // Fetch details for a specific selected request
  const fetchDetail = useCallback(
    async (requestId: string): Promise<boolean> => {
      const currentSeq = ++detailSeqRef.current;
      setIsLoadingDetail(true);
      setDetailError(null);
      setPublishError(null);
      setCloseError(null);

      if (isPreview) {
        setIsLoadingDetail(false);
        const found = SAMPLE_PREVIEW_DONATION_REQUESTS.find((r) => r.id === requestId);
        if (found) {
          setSelectedDetail(found);
          // Load preview donor responses
          setDonorResponses(found.status !== 'draft' ? SAMPLE_PREVIEW_DONOR_RESPONSES : []);
          setResponsesPagination({
            page: 1,
            limit: 10,
            total: found.status !== 'draft' ? SAMPLE_PREVIEW_DONOR_RESPONSES.length : 0,
            totalPages: 1,
            hasNextPage: false,
          });
          return true;
        } else {
          setDetailError('Request not found in preview data.');
          return false;
        }
      }

      if (!token) {
        setIsLoadingDetail(false);
        setDetailError('Authentication required.');
        return false;
      }

      try {
        const res = await adminApi.getDonationRequestById(token, requestId);
        if (currentSeq !== detailSeqRef.current) return false;
        setSelectedDetail(res.request);

        // Fetch donor responses for this request
        void fetchResponses(requestId, 1);
        return true;
      } catch (err: any) {
        if (currentSeq !== detailSeqRef.current) return false;
        setDetailError(err?.message || 'Failed to load donation request details.');
        return false;
      } finally {
        if (currentSeq === detailSeqRef.current) {
          setIsLoadingDetail(false);
        }
      }
    },
    [fetchResponses, isPreview, token],
  );

  const handleSelectRequest = (id: string) => {
    setPostMutationRefreshError(null);
    setSelectedRequestId(id);
    void fetchDetail(id);
  };

  const handleCloseDetail = () => {
    setPostMutationRefreshError(null);
    setSelectedRequestId(null);
    setSelectedDetail(null);
    setDetailError(null);
    setDonorResponses([]);
    setIsPublishModalOpen(false);
    setIsCloseModalOpen(false);
  };

  // Open Create Form
  const handleOpenCreateForm = () => {
    setIsEditMode(false);
    setFormBloodGroup('O+');
    setFormUnits('2');
    setFormHospitalId(hospitals[0]?.id || 'hosp-nbts-narahenpita');
    setFormLocation('');
    setFormUrgency('Urgent');
    setFormNeededByPreset('none');
    setFormNeededByDate('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form (for Draft only)
  const handleOpenEditForm = () => {
    if (!selectedDetail || selectedDetail.status !== 'draft') return;
    setIsEditMode(true);
    setFormBloodGroup(selectedDetail.bloodGroup);
    setFormUnits(String(selectedDetail.unitsRequired));
    setFormHospitalId(selectedDetail.hospitalId);
    setFormLocation(selectedDetail.locationDescription);
    setFormUrgency(selectedDetail.urgency);
    if (selectedDetail.neededBy) {
      setFormNeededByPreset('none');
      setFormNeededByDate(selectedDetail.neededBy);
    } else {
      setFormNeededByPreset('none');
      setFormNeededByDate('');
    }
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormError(null);
  };

  // Preset Date Selection Helper
  const handleSelectPresetDate = (preset: 'none' | '24h' | '3d' | '7d') => {
    setFormNeededByPreset(preset);
    const now = new Date();
    if (preset === 'none') {
      setFormNeededByDate('');
    } else if (preset === '24h') {
      const d = new Date(now.getTime() + 86400000);
      setFormNeededByDate(d.toISOString());
    } else if (preset === '3d') {
      const d = new Date(now.getTime() + 86400000 * 3);
      setFormNeededByDate(d.toISOString());
    } else if (preset === '7d') {
      const d = new Date(now.getTime() + 86400000 * 7);
      setFormNeededByDate(d.toISOString());
    }
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async () => {
    setFormError(null);

    const units = parseInt(formUnits, 10);
    if (Number.isNaN(units) || units < 1 || units > 100) {
      setFormError('Units required must be an integer between 1 and 100.');
      return;
    }

    if (!formHospitalId) {
      setFormError('Please select a hospital from the catalogue.');
      return;
    }

    const cleanLocation = formLocation.trim();
    if (cleanLocation.length < 2 || cleanLocation.length > 200) {
      setFormError('Location description must be between 2 and 200 characters.');
      return;
    }

    let finalNeededBy: string | null = null;
    if (formNeededByDate.trim()) {
      const d = new Date(formNeededByDate.trim());
      if (Number.isNaN(d.getTime())) {
        setFormError('Invalid needed-by date format.');
        return;
      }
      if (d <= new Date()) {
        setFormError('Needed-by deadline must be set in the future.');
        return;
      }
      finalNeededBy = d.toISOString();
    }

    setIsSubmittingForm(true);

    if (isPreview) {
      setTimeout(() => {
        setIsSubmittingForm(false);
        setIsFormOpen(false);
        const hospital = hospitals.find((h) => h.id === formHospitalId) || hospitals[0]!;
        if (isEditMode && selectedDetail) {
          const updated: AdminDonationRequestDetail = {
            ...selectedDetail,
            bloodGroup: formBloodGroup,
            unitsRequired: units,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            locationDescription: cleanLocation,
            urgency: formUrgency,
            neededBy: finalNeededBy,
            updatedAt: new Date().toISOString(),
          };
          setSelectedDetail(updated);
          setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } else {
          const newReq: AdminDonationRequestDetail = {
            id: `dreq_prev_${Date.now()}`,
            bloodGroup: formBloodGroup,
            unitsRequired: units,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            locationDescription: cleanLocation,
            urgency: formUrgency,
            neededBy: finalNeededBy,
            status: 'draft',
            publishedAt: null,
            closedAt: null,
            responseCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByAdmin: {
              id: 'admin_prev',
              name: user?.name || 'Administrator',
              email: user?.email || 'admin@lifeline.lk',
            },
          };
          setRequests((prev) => [newReq, ...prev]);
          setSelectedRequestId(newReq.id);
          setSelectedDetail(newReq);
        }
      }, 500);
      return;
    }

    if (!token) {
      setIsSubmittingForm(false);
      setFormError('Administrative session missing.');
      return;
    }

    try {
      if (isEditMode && selectedDetail) {
        const payload: UpdateDonationRequestPayload = {
          bloodGroup: formBloodGroup,
          unitsRequired: units,
          hospitalId: formHospitalId,
          locationDescription: cleanLocation,
          urgency: formUrgency,
          neededBy: finalNeededBy,
          expectedUpdatedAt: selectedDetail.updatedAt,
        };
        const res = await adminApi.updateDonationRequest(token, selectedDetail.id, payload);
        setIsFormOpen(false);
        if (selectedRequestIdRef.current === selectedDetail.id) {
          setSelectedDetail(res.request);
        }
        void fetchList(true);
      } else {
        const payload: CreateDonationRequestPayload = {
          bloodGroup: formBloodGroup,
          unitsRequired: units,
          hospitalId: formHospitalId,
          locationDescription: cleanLocation,
          urgency: formUrgency,
          neededBy: finalNeededBy,
        };
        const res = await adminApi.createDonationRequest(token, payload);
        setIsFormOpen(false);
        setSelectedRequestId(res.request.id);
        setSelectedDetail(res.request);
        void fetchList(true);
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Failed to save donation request.';
      if (status === 409 && isEditMode && selectedDetail) {
        setFormError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(selectedDetail.id);
        void fetchList(true);
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Publish Confirm
  const handlePublishConfirm = async () => {
    if (!selectedDetail || selectedDetail.status !== 'draft') return;
    const targetId = selectedDetail.id;
    const targetUpdatedAt = selectedDetail.updatedAt;

    if (selectedDetail.neededBy && new Date(selectedDetail.neededBy) <= new Date()) {
      setPublishError('Cannot publish request with an expired deadline. Please edit the draft with a future date.');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    if (isPreview) {
      setTimeout(() => {
        setIsPublishing(false);
        setIsPublishModalOpen(false);
        const updated: AdminDonationRequestDetail = {
          ...selectedDetail,
          status: 'published',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (selectedRequestIdRef.current === targetId) {
          setSelectedDetail(updated);
        }
        setRequests((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, status: 'published', updatedAt: updated.updatedAt } : r)),
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsPublishing(false);
      setPublishError('Admin session token missing.');
      return;
    }

    try {
      const res = await adminApi.publishDonationRequest(token, targetId, targetUpdatedAt);
      setIsPublishModalOpen(false);
      setPostMutationRefreshError(null);

      if (selectedRequestIdRef.current === targetId) {
        setSelectedDetail(res.request);
      }

      const listOk = await fetchList(true);
      if (!listOk) {
        setPostMutationRefreshError({
          message: 'Published, but details could not be refreshed',
          onRetry: () => {
            setPostMutationRefreshError(null);
            void fetchList(true);
            if (selectedRequestIdRef.current === targetId) {
              void fetchDetail(targetId);
            }
          },
        });
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Failed to publish donation request.';
      if (status === 409) {
        setPublishError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(targetId);
        void fetchList(true);
      } else {
        setPublishError(msg);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Close Confirm
  const handleCloseConfirm = async () => {
    if (!selectedDetail || selectedDetail.status !== 'published') return;
    const targetId = selectedDetail.id;
    const targetUpdatedAt = selectedDetail.updatedAt;

    setIsClosing(true);
    setCloseError(null);

    if (isPreview) {
      setTimeout(() => {
        setIsClosing(false);
        setIsCloseModalOpen(false);
        const updated: AdminDonationRequestDetail = {
          ...selectedDetail,
          status: 'closed',
          closedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (selectedRequestIdRef.current === targetId) {
          setSelectedDetail(updated);
        }
        setRequests((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, status: 'closed', updatedAt: updated.updatedAt } : r)),
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsClosing(false);
      setCloseError('Admin session token missing.');
      return;
    }

    try {
      const res = await adminApi.closeDonationRequest(token, targetId, targetUpdatedAt);
      setIsCloseModalOpen(false);
      setPostMutationRefreshError(null);

      if (selectedRequestIdRef.current === targetId) {
        setSelectedDetail(res.request);
      }

      const listOk = await fetchList(true);
      if (!listOk) {
        setPostMutationRefreshError({
          message: 'Closed, but details could not be refreshed',
          onRetry: () => {
            setPostMutationRefreshError(null);
            void fetchList(true);
            if (selectedRequestIdRef.current === targetId) {
              void fetchDetail(targetId);
            }
          },
        });
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Failed to close donation request.';
      if (status === 409) {
        setCloseError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(targetId);
        void fetchList(true);
      } else {
        setCloseError(msg);
      }
    } finally {
      setIsClosing(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: 'draft' | 'published' | 'closed') => {
    if (status === 'draft') {
      return (
        <View style={[styles.statusBadge, styles.statusDraft]}>
          <Text style={[styles.statusBadgeText, styles.statusDraftText]}>Draft</Text>
        </View>
      );
    }
    if (status === 'published') {
      return (
        <View style={[styles.statusBadge, styles.statusPublished]}>
          <Text style={[styles.statusBadgeText, styles.statusPublishedText]}>Published</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusClosed]}>
        <Text style={[styles.statusBadgeText, styles.statusClosedText]}>Closed</Text>
      </View>
    );
  };

  // Render Left Column: Requests List
  const renderList = () => (
    <View style={styles.listContainer}>
      {/* Search and Filters Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.secondaryMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hospital, location, blood group..."
            placeholderTextColor={colors.secondaryMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.secondaryMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
          {(
            [
              { id: 'all', label: 'All', count: counts.draft + counts.published + counts.closed },
              { id: 'draft', label: 'Drafts', count: counts.draft },
              { id: 'published', label: 'Published', count: counts.published },
              { id: 'closed', label: 'Closed', count: counts.closed },
            ] as const
          ).map((tab) => {
            const isTabActive = statusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.statusTabBtn, isTabActive && styles.statusTabBtnActive]}
                onPress={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusTabText, isTabActive && styles.statusTabTextActive]}>{tab.label}</Text>
                <View style={[styles.statusTabCountPill, isTabActive && styles.statusTabCountPillActive]}>
                  <Text style={[styles.statusTabCountText, isTabActive && styles.statusTabCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List State Handling */}
      {isLoadingList ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading donation requests...</Text>
        </View>
      ) : listError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
          <Text style={styles.errorText}>{listError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void fetchList(true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="water-outline" size={44} color={colors.secondaryMuted} />
          <Text style={styles.emptyTitle}>No donation requests found</Text>
          <Text style={styles.emptySubtitle}>
            {debouncedSearch
              ? `No requests match "${debouncedSearch}". Try a different search term.`
              : statusFilter !== 'all'
              ? `No ${statusFilter} donation requests right now.`
              : 'Create a donation request draft to invite eligible donors to donate.'}
          </Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={handleOpenCreateForm}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Create Donation Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.cardsScroll} contentContainerStyle={styles.cardsScrollContent}>
          {requests.map((item) => {
            const isSelected = selectedRequestId === item.id;
            const isUrgent = item.urgency === 'Urgent';
            const isExpired = item.neededBy ? new Date(item.neededBy) < new Date() : false;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.requestCard, isSelected && styles.requestCardSelected]}
                onPress={() => handleSelectRequest(item.id)}
                activeOpacity={0.8}
              >
                {/* Card Top Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.bloodPill}>
                    <Text style={styles.bloodPillText}>{item.bloodGroup}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.urgencyBadge, isUrgent ? styles.urgencyUrgent : styles.urgencyScheduled]}>
                      <Text style={[styles.urgencyText, isUrgent ? styles.urgencyTextUrgent : styles.urgencyTextScheduled]}>
                        {item.urgency}
                      </Text>
                    </View>
                    {renderStatusBadge(item.status)}
                  </View>
                </View>

                {/* Hospital and Location */}
                <View style={styles.hospitalInfoRow}>
                  <Ionicons name="business-outline" size={16} color={colors.secondary} />
                  <Text style={styles.hospitalNameText} numberOfLines={1}>
                    {item.hospitalName}
                  </Text>
                </View>

                <View style={styles.locationInfoRow}>
                  <Ionicons name="location-outline" size={14} color={colors.secondaryMuted} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.locationDescription}
                  </Text>
                </View>

                {/* Units & Deadline */}
                <View style={styles.cardMetaRow}>
                  <Text style={styles.unitsText}>
                    <Text style={styles.unitsNumber}>{item.unitsRequired}</Text> Units Needed
                  </Text>

                  {item.neededBy ? (
                    <Text style={[styles.deadlineText, isExpired && styles.deadlineExpiredText]}>
                      {isExpired ? 'Expired: ' : 'Needed: '}
                      {formatDateTime(item.neededBy)}
                    </Text>
                  ) : (
                    <Text style={styles.deadlineText}>No deadline</Text>
                  )}
                </View>

                {/* Bottom Stats: Donor Offers Counter */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.donorOffersBadge}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <Text style={styles.donorOffersText}>
                      {item.responseCount} {item.responseCount === 1 ? 'Donor Offer' : 'Donor Offers'}
                    </Text>
                  </View>

                  <Text style={styles.createdDateText}>Created {formatDateTime(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.paginationBtn, page <= 1 && styles.paginationBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.secondaryMuted : colors.secondary} />
                <Text style={[styles.paginationBtnText, page <= 1 && styles.paginationBtnTextDisabled]}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageInfoText}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </Text>

              <TouchableOpacity
                style={[styles.paginationBtn, !pagination.hasNextPage && styles.paginationBtnDisabled]}
                onPress={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                <Text style={[styles.paginationBtnText, !pagination.hasNextPage && styles.paginationBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={!pagination.hasNextPage ? colors.secondaryMuted : colors.secondary}
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  // Render Right Column: Selected Request Details or Empty Selection
  const renderDetailPanel = () => {
    if (isLoadingDetail) {
      return (
        <View style={styles.detailLoadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      );
    }

    if (detailError || !selectedDetail) {
      return (
        <View style={styles.detailEmptyPromptBox}>
          <Ionicons name="water-outline" size={48} color={colors.border} />
          <Text style={styles.detailEmptyPromptTitle}>Select a donation request</Text>
          <Text style={styles.detailEmptyPromptSubtitle}>
            Choose a card from the left list to review complete details, publish drafts, monitor donor offers, or close the request.
          </Text>
        </View>
      );
    }

    const d = selectedDetail;
    const isDraft = d.status === 'draft';
    const isPublished = d.status === 'published';
    const isClosed = d.status === 'closed';
    const isExpired = d.neededBy ? new Date(d.neededBy) < new Date() : false;

    return (
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderTop}>
            <View style={styles.detailHeaderLeft}>
              <View style={styles.bloodPillLarge}>
                <Text style={styles.bloodPillLargeText}>{d.bloodGroup}</Text>
              </View>
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.detailHospitalTitle}>{d.hospitalName}</Text>
                <Text style={styles.detailRefId}>Ref: {d.id}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeDetailBtn} onPress={handleCloseDetail} accessibilityLabel="Close details panel">
              <Ionicons name="close" size={20} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.detailBadgeRow}>
            {renderStatusBadge(d.status)}
            <View
              style={[
                styles.urgencyBadge,
                d.urgency === 'Urgent' ? styles.urgencyUrgent : styles.urgencyScheduled,
              ]}
            >
              <Text style={[styles.urgencyText, d.urgency === 'Urgent' ? styles.urgencyTextUrgent : styles.urgencyTextScheduled]}>
                {d.urgency} Request
              </Text>
            </View>
          </View>
        </View>

        {/* Post-Mutation Refresh Error Notice */}
        {postMutationRefreshError && (
          <View style={styles.refreshNoticeBanner}>
            <View style={styles.refreshNoticeContent}>
              <Ionicons name="warning-outline" size={18} color="#B45309" />
              <Text style={styles.refreshNoticeText}>{postMutationRefreshError.message}</Text>
            </View>
            <View style={styles.refreshNoticeActions}>
              <TouchableOpacity
                style={styles.refreshNoticeRetryBtn}
                onPress={postMutationRefreshError.onRetry}
                accessibilityRole="button"
              >
                <Text style={styles.refreshNoticeRetryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshNoticeDismissBtn}
                onPress={() => setPostMutationRefreshError(null)}
              >
                <Ionicons name="close" size={16} color="#B45309" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Lifecycle Notice Banner */}
        {isDraft && (
          <View style={styles.draftNoticeBanner}>
            <Ionicons name="document-text-outline" size={20} color="#B45309" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.draftNoticeTitle}>Draft Request</Text>
              <Text style={styles.draftNoticeSubtitle}>
                This request is private to administrators. Donors will not see this invitation until you publish it.
              </Text>
            </View>
          </View>
        )}

        {isPublished && (
          <View style={styles.publishedNoticeBanner}>
            <Ionicons name="radio-outline" size={20} color="#15803D" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.publishedNoticeTitle}>Live &amp; Published</Text>
              <Text style={styles.publishedNoticeSubtitle}>
                This request is actively published on the donor dashboard. Eligible donors can view details and offer to donate.
              </Text>
            </View>
          </View>
        )}

        {isClosed && (
          <View style={styles.closedNoticeBanner}>
            <Ionicons name="lock-closed-outline" size={20} color="#475569" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.closedNoticeTitle}>Request Closed</Text>
              <Text style={styles.closedNoticeSubtitle}>
                Closed on {formatDateTime(d.closedAt)}. No further donor offers are accepted, but existing responses are preserved below.
              </Text>
            </View>
          </View>
        )}

        {/* Request Specifications Section Card */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionTitle}>REQUEST SPECIFICATIONS</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Blood Group</Text>
              <Text style={styles.infoValueBold}>{d.bloodGroup}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Units Required</Text>
              <Text style={styles.infoValueBold}>{d.unitsRequired} Units</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Donor Offers</Text>
              <Text style={[styles.infoValueBold, { color: colors.primary }]}>{d.responseCount} Offers</Text>
            </View>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Hospital Facility</Text>
            <Text style={styles.infoValue}>{d.hospitalName}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Location Details</Text>
            <Text style={styles.infoValue}>{d.locationDescription}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Needed-by Deadline</Text>
            <Text style={[styles.infoValue, isExpired && { color: colors.danger, fontWeight: '700' }]}>
              {d.neededBy ? formatDateTime(d.neededBy) : 'Open / No deadline specified'}
              {isExpired ? ' (EXPIRED)' : ''}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Created Date</Text>
            <Text style={styles.infoValue}>{formatDateTime(d.createdAt)}</Text>
          </View>

          {d.publishedAt && (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Published Date</Text>
              <Text style={styles.infoValue}>{formatDateTime(d.publishedAt)}</Text>
            </View>
          )}

          {d.closedAt && (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Closed Date</Text>
              <Text style={styles.infoValue}>{formatDateTime(d.closedAt)}</Text>
            </View>
          )}

          {d.createdByAdmin && (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Created By</Text>
              <Text style={styles.infoValue}>{d.createdByAdmin.name}</Text>
            </View>
          )}
        </View>

        {/* Action Controls Section */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionTitle}>ADMINISTRATIVE ACTIONS</Text>

          {isDraft && (
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.editDraftBtn}
                onPress={handleOpenEditForm}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={colors.secondary} />
                <Text style={styles.editDraftBtnText}>Edit Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publishBtn}
                onPress={() => {
                  setPublishError(null);
                  setIsPublishModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish Invitation</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPublished && (
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.closeRequestBtn}
                onPress={() => {
                  setCloseError(null);
                  setIsCloseModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
                <Text style={styles.closeRequestBtnText}>Close Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {isClosed && (
            <Text style={styles.readOnlyActionNote}>
              This request is finalized and closed. Reopening closed donation requests is disabled to preserve historical compliance.
            </Text>
          )}
        </View>

        {/* Section: Donor Offers & Responses */}
        <View style={styles.detailSectionCard}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionTitle}>DONOR OFFERS &amp; RESPONSES</Text>
              <Text style={styles.sectionSubtitle}>
                Responses represent donor willingness to attend and donate, not clinical completion.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshResponsesIconBtn}
              onPress={() => void fetchResponses(d.id, responsesPagination.page)}
              accessibilityLabel="Refresh donor responses"
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoadingResponses ? (
            <View style={styles.responsesLoadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.responsesLoadingText}>Loading donor responses...</Text>
            </View>
          ) : responsesError ? (
            <View style={styles.responsesErrorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.responsesErrorText}>{responsesError}</Text>
              <TouchableOpacity
                style={styles.responsesRetryBtn}
                onPress={() => void fetchResponses(d.id, responsesPagination.page)}
              >
                <Text style={styles.responsesRetryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : donorResponses.length === 0 ? (
            <View style={styles.responsesEmptyBox}>
              <Ionicons name="people-outline" size={32} color={colors.secondaryMuted} />
              <Text style={styles.responsesEmptyTitle}>No donor offers yet</Text>
              <Text style={styles.responsesEmptySubtitle}>
                {isDraft
                  ? 'Publish this request to invite registered donors to offer blood donations.'
                  : 'Eligible donors see this request on their dashboard. Check back for offers.'}
              </Text>
            </View>
          ) : (
            <View style={styles.responsesList}>
              {donorResponses.map((resp, index) => (
                <View key={resp.responseId} style={styles.responseItemRow}>
                  <View style={styles.responseAvatar}>
                    <Text style={styles.responseAvatarText}>
                      {resp.donorName ? resp.donorName[0]?.toUpperCase() : 'D'}
                    </Text>
                  </View>
                  <View style={styles.responseInfoCol}>
                    <View style={styles.responseNameRow}>
                      <Text style={styles.responseDonorName}>{resp.donorName}</Text>
                      {resp.donorBloodGroup && (
                        <View style={styles.responseBloodBadge}>
                          <Text style={styles.responseBloodBadgeText}>{resp.donorBloodGroup}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.responseDistrictText}>
                      {resp.donorDistrict ? `District: ${resp.donorDistrict}` : 'Location unlisted'} • Accepted on{' '}
                      {formatDateTime(resp.acceptedAt)}
                    </Text>
                  </View>
                  <View style={styles.responseStatusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                    <Text style={styles.responseStatusText}>Willing to donate</Text>
                  </View>
                </View>
              ))}

              {/* Donor Responses Pagination */}
              {responsesPagination.totalPages > 1 && (
                <View style={styles.responsesPaginationRow}>
                  <TouchableOpacity
                    style={[styles.paginationBtnSmall, responsesPagination.page <= 1 && styles.paginationBtnDisabled]}
                    onPress={() => void fetchResponses(d.id, responsesPagination.page - 1)}
                    disabled={responsesPagination.page <= 1}
                  >
                    <Ionicons name="chevron-back" size={14} color={colors.secondary} />
                  </TouchableOpacity>

                  <Text style={styles.responsesPageInfoText}>
                    Page {responsesPagination.page} of {responsesPagination.totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.paginationBtnSmall,
                      !responsesPagination.hasNextPage && styles.paginationBtnDisabled,
                    ]}
                    onPress={() => void fetchResponses(d.id, responsesPagination.page + 1)}
                    disabled={!responsesPagination.hasNextPage}
                  >
                    <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderTitleCol}>
          <Text style={styles.topHeaderTitle}>Donation Requests Management</Text>
          <Text style={styles.topHeaderSubtitle}>
            Create and publish donation invitations for registered donors, monitor willingness offers, and coordinate request closures.
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleOpenCreateForm} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Donation Request</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Layout */}
      <View style={styles.mainLayoutRow}>
        {/* Left Column (Requests List) */}
        <View style={[styles.leftColumn, isDesktop && selectedRequestId && styles.leftColumnWithPanel]}>
          {renderList()}
        </View>

        {/* Right Column: Desktop Side Panel */}
        {isDesktop && selectedRequestId && (
          <View style={styles.rightColumnPanel}>
            {renderDetailPanel()}
          </View>
        )}
      </View>

      {/* Small Screen: Details Modal */}
      {!isDesktop && (
        <Modal
          visible={Boolean(selectedRequestId)}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseDetail}
        >
          <View style={styles.mobileModalContainer}>
            {renderDetailPanel()}
          </View>
        </Modal>
      )}

      {/* Create / Edit Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalCardTitle}>
                  {isEditMode ? 'Edit Draft Donation Request' : 'Create Donation Request'}
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  {isEditMode
                    ? 'Update parameters before publishing to donors.'
                    : 'Requests are saved as draft first. You can publish whenever ready.'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseForm} accessibilityLabel="Close form">
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            {formError && (
              <View style={styles.inlineErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.inlineErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent}>
              {/* Blood Group Picker */}
              <Text style={styles.formLabel}>Target Blood Group *</Text>
              <View style={styles.bloodPillGrid}>
                {BLOOD_GROUPS.map((bg) => {
                  const isChosen = formBloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.bloodChoicePill, isChosen && styles.bloodChoicePillActive]}
                      onPress={() => setFormBloodGroup(bg)}
                    >
                      <Text style={[styles.bloodChoiceText, isChosen && styles.bloodChoiceTextActive]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Units Required */}
              <Text style={styles.formLabel}>Units Required (1 - 100) *</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="number-pad"
                value={formUnits}
                onChangeText={setFormUnits}
                placeholder="e.g. 5"
                placeholderTextColor={colors.secondaryMuted}
              />

              {/* Hospital Selection */}
              <Text style={styles.formLabel}>Hospital Facility *</Text>
              <View style={styles.hospitalsPickerContainer}>
                {hospitals.map((hosp) => {
                  const isSelected = formHospitalId === hosp.id;
                  return (
                    <TouchableOpacity
                      key={hosp.id}
                      style={[styles.hospitalOptionCard, isSelected && styles.hospitalOptionCardActive]}
                      onPress={() => setFormHospitalId(hosp.id)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isSelected ? colors.primary : colors.secondaryMuted}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.hospitalOptionName, isSelected && styles.hospitalOptionNameActive]}>
                          {hosp.name}
                        </Text>
                        <Text style={styles.hospitalOptionDistrict}>District: {hosp.district}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Location Description */}
              <Text style={styles.formLabel}>Location Instructions *</Text>
              <TextInput
                style={[styles.formInput, styles.formInputArea]}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="e.g. Blood Bank 2nd Floor, Room 204. Enter through Emergency wing."
                placeholderTextColor={colors.secondaryMuted}
                multiline
                numberOfLines={3}
              />

              {/* Urgency */}
              <Text style={styles.formLabel}>Clinical Urgency *</Text>
              <View style={styles.urgencyChoiceRow}>
                {URGENCIES.map((urg) => {
                  const isSelected = formUrgency === urg;
                  return (
                    <TouchableOpacity
                      key={urg}
                      style={[styles.urgencyChoiceBtn, isSelected && styles.urgencyChoiceBtnActive]}
                      onPress={() => setFormUrgency(urg)}
                    >
                      <Ionicons
                        name={urg === 'Urgent' ? 'flame-outline' : 'calendar-outline'}
                        size={16}
                        color={isSelected ? colors.primary : colors.secondary}
                      />
                      <Text style={[styles.urgencyChoiceText, isSelected && styles.urgencyChoiceTextActive]}>
                        {urg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Needed-by Deadline */}
              <Text style={styles.formLabel}>Needed-by Deadline (Optional)</Text>
              <Text style={styles.formHint}>Select a quick preset or type ISO timestamp.</Text>
              <View style={styles.presetsRow}>
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: '24h', label: '+24 Hours' },
                    { id: '3d', label: '+3 Days' },
                    { id: '7d', label: '+7 Days' },
                  ] as const
                ).map((p) => {
                  const isActive = formNeededByPreset === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                      onPress={() => handleSelectPresetDate(p.id)}
                    >
                      <Text style={[styles.presetBtnText, isActive && styles.presetBtnTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.formInput}
                value={formNeededByDate}
                onChangeText={(val) => {
                  setFormNeededByDate(val);
                  setFormNeededByPreset('none');
                }}
                placeholder="ISO format: YYYY-MM-DDTHH:MM:SS"
                placeholderTextColor={colors.secondaryMuted}
              />
            </ScrollView>

            {/* Form Action Buttons */}
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={handleCloseForm}
                disabled={isSubmittingForm}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formSubmitBtn, isSubmittingForm && styles.btnDisabled]}
                onPress={handleSubmitForm}
                disabled={isSubmittingForm}
              >
                {isSubmittingForm ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>
                    {isEditMode ? 'Save Changes' : 'Save as Draft'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Publish Confirmation Dialog Modal */}
      <Modal
        visible={isPublishModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsPublishModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCirclePublish}>
              <Ionicons name="paper-plane-outline" size={28} color="#15803D" />
            </View>
            <Text style={styles.dialogTitle}>Publish Donation Request?</Text>
            <Text style={styles.dialogSubtitle}>
              This invitation will become immediately visible to eligible registered blood donors on their donor dashboard.
            </Text>

            {publishError && (
              <View style={styles.inlineErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.inlineErrorText}>{publishError}</Text>
              </View>
            )}

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsPublishModalOpen(false)}
                disabled={isPublishing}
              >
                <Text style={styles.dialogCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogPublishBtn, isPublishing && styles.btnDisabled]}
                onPress={handlePublishConfirm}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogPublishBtnText}>Confirm Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Close Confirmation Dialog Modal */}
      <Modal
        visible={isCloseModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCloseModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCircleClose}>
              <Ionicons name="lock-closed-outline" size={28} color="#B45309" />
            </View>
            <Text style={styles.dialogTitle}>Close Donation Request?</Text>
            <Text style={styles.dialogSubtitle}>
              Closing will immediately remove this invitation from donor dashboards and reject new donation acceptances.
              Existing donor responses will be safely preserved as historical records.
            </Text>

            {closeError && (
              <View style={styles.inlineErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.inlineErrorText}>{closeError}</Text>
              </View>
            )}

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsCloseModalOpen(false)}
                disabled={isClosing}
              >
                <Text style={styles.dialogCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogCloseConfirmBtn, isClosing && styles.btnDisabled]}
                onPress={handleCloseConfirm}
                disabled={isClosing}
              >
                {isClosing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogCloseConfirmBtnText}>Confirm Closure</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  topHeaderTitleCol: {
    flex: 1,
    minWidth: 260,
  },
  topHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  topHeaderSubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 8,
    ...shadows.sm,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Main Columns
  mainLayoutRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
    height: '100%',
  },
  leftColumnWithPanel: {
    maxWidth: 520,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  rightColumnPanel: {
    flex: 1,
    backgroundColor: colors.card,
    height: '100%',
  },
  mobileModalContainer: {
    flex: 1,
    backgroundColor: colors.card,
  },

  // List Container
  listContainer: {
    flex: 1,
  },
  filterBar: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.secondary,
  },
  statusTabsScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  statusTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondarySoft,
    gap: 6,
  },
  statusTabBtnActive: {
    backgroundColor: colors.secondary,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  statusTabCountPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  statusTabCountPillActive: {
    backgroundColor: colors.primary,
  },
  statusTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  statusTabCountTextActive: {
    color: '#FFFFFF',
  },

  // Cards Scroll
  cardsScroll: {
    flex: 1,
  },
  cardsScrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    ...shadows.sm,
  },
  requestCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFBFB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bloodPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  urgencyUrgent: {
    backgroundColor: '#FEE2E2',
  },
  urgencyScheduled: {
    backgroundColor: '#E0F2FE',
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgencyTextUrgent: {
    color: '#DC2626',
  },
  urgencyTextScheduled: {
    color: '#0284C7',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusPublished: {
    backgroundColor: '#DCFCE7',
  },
  statusClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusDraftText: {
    color: '#B45309',
  },
  statusPublishedText: {
    color: '#15803D',
  },
  statusClosedText: {
    color: '#475569',
  },

  hospitalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hospitalNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
    flex: 1,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: colors.secondaryMuted,
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  unitsText: {
    fontSize: 12,
    color: colors.secondary,
  },
  unitsNumber: {
    fontWeight: '700',
    color: colors.secondary,
  },
  deadlineText: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  deadlineExpiredText: {
    color: colors.danger,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  donorOffersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  donorOffersText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  createdDateText: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },

  // Pagination Controls
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  paginationBtnDisabled: {
    opacity: 0.4,
  },
  paginationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  paginationBtnTextDisabled: {
    color: colors.secondaryMuted,
  },
  pageInfoText: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },

  // Empty, Loading, Error States
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondaryMuted,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 6,
    marginTop: spacing.xs,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Right Details Panel
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailLoadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  detailEmptyPromptBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  detailEmptyPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  detailEmptyPromptSubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },

  // Details Header
  detailHeader: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bloodPillLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodPillLargeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  detailHospitalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  detailRefId: {
    fontSize: 12,
    color: colors.secondaryMuted,
    marginTop: 2,
  },
  closeDetailBtn: {
    padding: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondarySoft,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Status Banners
  draftNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  draftNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  draftNoticeSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  publishedNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  publishedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  publishedNoticeSubtitle: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
  closedNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  closedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  closedNoticeSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },

  // Refresh Failure Banner
  refreshNoticeBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  refreshNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  refreshNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  refreshNoticeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshNoticeRetryBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  refreshNoticeRetryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshNoticeDismissBtn: {
    padding: 4,
  },

  // Details Section Card
  detailSectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondaryMuted,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.secondaryMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refreshResponsesIconBtn: {
    padding: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dangerSoft,
  },

  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginBottom: 2,
  },
  infoValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'right',
    maxWidth: '65%',
  },

  // Actions
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondarySoft,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  editDraftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  publishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeRequestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  closeRequestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readOnlyActionNote: {
    fontSize: 12,
    color: colors.secondaryMuted,
    lineHeight: 17,
  },

  // Donor Responses Section
  responsesLoadingBox: {
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  responsesLoadingText: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },
  responsesErrorBox: {
    padding: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responsesErrorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  responsesRetryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
  },
  responsesRetryBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  responsesEmptyBox: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  responsesEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  responsesEmptySubtitle: {
    fontSize: 12,
    color: colors.secondaryMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  responsesList: {
    gap: spacing.sm,
  },
  responseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  responseAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  responseInfoCol: {
    flex: 1,
  },
  responseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responseDonorName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  responseBloodBadge: {
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  responseBloodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  responseDistrictText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginTop: 2,
  },
  responseStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  responseStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  responsesPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: 4,
  },
  paginationBtnSmall: {
    padding: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondarySoft,
  },
  responsesPageInfoText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginHorizontal: 4,
  },

  // Modals & Form
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderTitleCol: {
    flex: 1,
  },
  modalCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
  },
  modalCardSubtitle: {
    fontSize: 12,
    color: colors.secondaryMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  formScroll: {
    maxHeight: 460,
  },
  formScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 4,
  },
  formHint: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginTop: -2,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.secondary,
  },
  formInputArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  bloodPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  bloodChoicePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bloodChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  bloodChoiceTextActive: {
    color: '#FFFFFF',
  },
  hospitalsPickerContainer: {
    gap: 6,
  },
  hospitalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  hospitalOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBFB',
  },
  hospitalOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  hospitalOptionNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  hospitalOptionDistrict: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  urgencyChoiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urgencyChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
  },
  urgencyChoiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerSoft,
  },
  urgencyChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  urgencyChoiceTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondarySoft,
  },
  presetBtnActive: {
    backgroundColor: colors.secondary,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondarySoft,
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  formSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    minWidth: 110,
    alignItems: 'center',
  },
  formSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Dialog Modals
  dialogCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.lg,
  },
  dialogIconCirclePublish: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dialogIconCircleClose: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
    textAlign: 'center',
  },
  dialogSubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: '100%',
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
  },
  dialogCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  dialogPublishBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  dialogPublishBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialogCloseConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: '#D97706',
    alignItems: 'center',
  },
  dialogCloseConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 6,
  },
  inlineErrorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminDonationRequestsScreen;
