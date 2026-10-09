import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { adminApi } from '../services/adminApi';
import type {
  AdminPatientRequestItem,
  AdminPatientRequestDetail,
  AdminRequestStatusFilter,
  AdminPatientRequestsPagination,
} from '../types';

// Sri Lankan phone regex (10 digits starting with 0 or +94...)
const LK_PHONE_REGEX = /^(\+94\d{9}|0\d{9})$/;

// Format ISO date safely
function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
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

// Sample requests for Preview Mode
export const SAMPLE_PREVIEW_PATIENT_REQUESTS: AdminPatientRequestDetail[] = [
  {
    id: 'req_prev_001',
    patientName: 'Kavindu Perera',
    bloodGroup: 'O+',
    unitsRequired: 2,
    unitsFulfilled: 0,
    hospitalId: 'hosp_nHSL',
    hospitalName: 'National Hospital of Sri Lanka',
    hospitalReferenceAndWard: 'Ward 14, Bed 8',
    urgency: 'Urgent',
    status: 'pending_verification',
    document: {
      originalName: 'hospital_requisition_form_01.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
    },
    requester: {
      id: 'user_req_01',
      name: 'Sunil Perera',
      email: 'sunil.perera@example.com',
      phone: '0771234567',
    },
    deliveryAssignment: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'req_prev_002',
    patientName: 'Anoma Jayasinghe',
    bloodGroup: 'B+',
    unitsRequired: 3,
    unitsFulfilled: 0,
    hospitalId: 'hosp_cstlh',
    hospitalName: 'Castle Street Hospital for Women',
    hospitalReferenceAndWard: 'Maternity Ward 4',
    urgency: 'Scheduled',
    status: 'verified',
    document: {
      originalName: 'cstlh_blood_prescription.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 854000,
    },
    requester: {
      id: 'user_req_02',
      name: 'Kamal Jayasinghe',
      email: 'kamal.j@example.com',
      phone: '0719876543',
    },
    reviewedBy: {
      id: 'admin_01',
      name: 'Dr. Administrator',
      email: 'admin@lifeline.lk',
    },
    reviewedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    deliveryAssignment: null,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'req_prev_003',
    patientName: 'Ruwan Fernando',
    bloodGroup: 'AB-',
    unitsRequired: 1,
    unitsFulfilled: 0,
    hospitalId: 'hosp_lrsp',
    hospitalName: 'Lady Ridgeway Hospital for Children',
    hospitalReferenceAndWard: 'ICU Ward 2B',
    urgency: 'Urgent',
    status: 'in_progress',
    document: {
      originalName: 'lrh_urgent_request.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200000,
    },
    requester: {
      id: 'user_req_03',
      name: 'Nimal Fernando',
      email: 'nimal.f@example.com',
      phone: '0765554321',
    },
    reviewedBy: {
      id: 'admin_01',
      name: 'Dr. Administrator',
      email: 'admin@lifeline.lk',
    },
    reviewedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    deliveryAssignment: {
      assignmentId: 'asgn_prev_003',
      deliveryPersonName: 'Saman Kumara',
      contactPhone: '0773344556',
      assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      assignedBy: 'Dr. Administrator',
      arrivalConfirmedAt: null,
      isArrivalConfirmed: false,
    },
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'req_prev_004',
    patientName: 'Malkanthi Silva',
    bloodGroup: 'A+',
    unitsRequired: 2,
    unitsFulfilled: 0,
    hospitalId: 'hosp_kdu',
    hospitalName: 'University Hospital KDU',
    hospitalReferenceAndWard: 'Surgical Ward 3',
    urgency: 'Scheduled',
    status: 'verified',
    document: {
      originalName: 'kdu_blood_req_verified.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 940000,
    },
    requester: {
      id: 'user_req_04',
      name: 'Mahesh Silva',
      email: 'mahesh.silva@example.com',
      phone: '0701122334',
    },
    reviewedBy: {
      id: 'admin_01',
      name: 'Dr. Administrator',
      email: 'admin@lifeline.lk',
    },
    reviewedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    deliveryAssignment: {
      assignmentId: 'asgn_prev_004',
      deliveryPersonName: 'Kasun Wickramasinghe',
      contactPhone: '0782233445',
      assignedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
      assignedBy: 'Dr. Administrator',
      arrivalConfirmedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isArrivalConfirmed: true,
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'req_prev_005',
    patientName: 'Devinda Weerasinghe',
    bloodGroup: 'O-',
    unitsRequired: 1,
    unitsFulfilled: 0,
    hospitalId: 'hosp_nHSL',
    hospitalName: 'National Hospital of Sri Lanka',
    hospitalReferenceAndWard: 'Emergency Care Unit',
    urgency: 'Urgent',
    status: 'rejected',
    document: {
      originalName: 'unverified_document_unclear.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 420000,
    },
    requester: {
      id: 'user_req_05',
      name: 'Sarath Weerasinghe',
      email: 'sarath.w@example.com',
      phone: '0779988776',
    },
    rejectionReason: 'The uploaded hospital document is illegible and missing the official hospital consultant seal and date.',
    reviewedBy: {
      id: 'admin_01',
      name: 'Dr. Administrator',
      email: 'admin@lifeline.lk',
    },
    reviewedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    deliveryAssignment: null,
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
];

export function AdminPatientRequestsScreen() {
  const params = useLocalSearchParams<{ preview?: string; status?: string }>();
  const isPreview = params.preview === '1';
  const initialStatusParam = (params.status as AdminRequestStatusFilter) || 'all';

  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // List filter and pagination state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminRequestStatusFilter>(initialStatusParam);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // List data state
  const [requests, setRequests] = useState<AdminPatientRequestItem[]>([]);
  const [pagination, setPagination] = useState<AdminPatientRequestsPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Selected Request and Details state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminPatientRequestDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Document downloading state
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Approval modal state
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Delivery Assignment state
  const [deliveryPersonNameInput, setDeliveryPersonNameInput] = useState('');
  const [deliveryPhoneInput, setDeliveryPhoneInput] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [confirmReassignmentChecked, setConfirmReassignmentChecked] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccessMsg, setAssignmentSuccessMsg] = useState<string | null>(null);

  // Stale mutation guard & post-mutation refresh failure notice
  const selectedRequestIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);
  const [postMutationRefreshError, setPostMutationRefreshError] = useState<{
    message: string;
    onRetry: () => void;
  } | null>(null);

  // Sequence ref for race-condition prevention
  const listSeqRef = useRef(0);
  const detailSeqRef = useRef(0);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Requests List
  const fetchList = useCallback(
    async (isManualRefresh = false) => {
      const currentSeq = ++listSeqRef.current;

      if (isPreview) {
        setIsLoadingList(false);
        setIsRefreshingList(false);
        // Filter sample preview data locally
        let filtered = [...SAMPLE_PREVIEW_PATIENT_REQUESTS];
        if (statusFilter !== 'all') {
          filtered = filtered.filter((r) => r.status === statusFilter);
        }
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.id.toLowerCase().includes(q) ||
              r.patientName.toLowerCase().includes(q) ||
              r.hospitalName.toLowerCase().includes(q),
          );
        }
        const mappedItems: AdminPatientRequestItem[] = filtered.map((d) => ({
          id: d.id,
          patientName: d.patientName,
          bloodGroup: d.bloodGroup,
          unitsRequired: d.unitsRequired,
          unitsFulfilled: d.unitsFulfilled,
          hospitalName: d.hospitalName,
          hospitalReferenceAndWard: d.hospitalReferenceAndWard,
          urgency: d.urgency,
          status: d.status,
          hasDeliveryAssignment: Boolean(d.deliveryAssignment),
          deliveryPersonName: d.deliveryAssignment?.deliveryPersonName,
          arrivalConfirmedAt: d.deliveryAssignment?.arrivalConfirmedAt,
          isArrivalConfirmed: Boolean(d.deliveryAssignment?.isArrivalConfirmed),
          rejectionReason: d.rejectionReason,
          reviewedAt: d.reviewedAt || undefined,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
        setRequests(mappedItems);
        setPagination({
          page: 1,
          limit: 10,
          total: mappedItems.length,
          totalPages: 1,
          hasNextPage: false,
        });
        return true;
      }

      if (!token || user?.role !== 'admin') {
        setIsLoadingList(false);
        setIsRefreshingList(false);
        setListError('Administrative authentication required.');
        return false;
      }

      if (isManualRefresh) {
        setIsRefreshingList(true);
      } else {
        setIsLoadingList(true);
      }
      setListError(null);

      try {
        const response = await adminApi.getPatientRequests(token, {
          search: debouncedSearch,
          status: statusFilter,
          page,
          limit,
        });

        if (currentSeq !== listSeqRef.current) return false;

        setRequests(response.requests);
        setPagination(response.pagination);
        return true;
      } catch (err: any) {
        if (currentSeq !== listSeqRef.current) return false;
        setListError(err?.message || 'Failed to load patient requests.');
        return false;
      } finally {
        if (currentSeq === listSeqRef.current) {
          setIsLoadingList(false);
          setIsRefreshingList(false);
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

  // Fetch details for a specific selected request
  const fetchDetail = useCallback(
    async (requestId: string): Promise<boolean> => {
      const currentSeq = ++detailSeqRef.current;
      setIsLoadingDetail(true);
      setDetailError(null);
      setDocError(null);
      setApproveError(null);
      setRejectError(null);
      setAssignmentError(null);
      setAssignmentSuccessMsg(null);
      setIsReassigning(false);
      setConfirmReassignmentChecked(false);
      setDeliveryPersonNameInput('');
      setDeliveryPhoneInput('');

      if (isPreview) {
        setIsLoadingDetail(false);
        const found = SAMPLE_PREVIEW_PATIENT_REQUESTS.find((r) => r.id === requestId);
        if (found) {
          setSelectedDetail(found);
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
        const res = await adminApi.getPatientRequestById(token, requestId);
        if (currentSeq !== detailSeqRef.current) return false;
        setSelectedDetail(res.request);
        return true;
      } catch (err: any) {
        if (currentSeq !== detailSeqRef.current) return false;
        setDetailError(err?.message || 'Failed to load request details.');
        return false;
      } finally {
        if (currentSeq === detailSeqRef.current) {
          setIsLoadingDetail(false);
        }
      }
    },
    [isPreview, token],
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
    setIsApproveModalOpen(false);
    setIsRejectModalOpen(false);
    setAssignmentError(null);
    setAssignmentSuccessMsg(null);
  };

  // Safe document view/download with authenticated streaming & blob revocation
  const handleViewOrDownloadDocument = async () => {
    if (!selectedDetail) return;
    setDocError(null);
    setIsDownloadingDoc(true);

    if (isPreview) {
      setTimeout(() => {
        setIsDownloadingDoc(false);
        alert(
          `[Preview Mode] Document "${selectedDetail.document.originalName}" (${(
            selectedDetail.document.sizeBytes / 1024
          ).toFixed(1)} KB) would be safely downloaded via authenticated admin stream.`,
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsDownloadingDoc(false);
      setDocError('Admin session token required to download document.');
      return;
    }

    try {
      const { blob, filename } = await adminApi.fetchDocumentBlob(token, selectedDetail.id);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename || selectedDetail.document.originalName || 'document';
        window.document.body.appendChild(anchor);
        anchor.click();
        window.document.body.removeChild(anchor);

        // Immediate cleanup of transient object URL
        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 1500);
      } else {
        alert(`Document downloaded successfully: ${filename}`);
      }
    } catch (err: any) {
      setDocError(err?.message || 'Unable to download document file. File may be missing or corrupt.');
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  // Handle Approve Action
  const handleApproveConfirm = async () => {
    if (!selectedDetail) return;
    const targetId = selectedDetail.id;
    const targetUpdatedAt = selectedDetail.updatedAt;
    setIsApproving(true);
    setApproveError(null);

    if (isPreview) {
      setTimeout(() => {
        setIsApproving(false);
        setIsApproveModalOpen(false);
        const updated: AdminPatientRequestDetail = {
          ...selectedDetail,
          status: 'verified',
          reviewedBy: {
            id: 'admin_preview',
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lifeline.lk',
          },
          reviewer: {
            id: 'admin_preview',
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lifeline.lk',
          },
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (selectedRequestIdRef.current === targetId) {
          setSelectedDetail(updated);
        }
        setRequests((prev) =>
          statusFilter === 'pending_verification'
            ? prev.filter((r) => r.id !== updated.id)
            : prev.map((r) => (r.id === updated.id ? { ...r, status: 'verified', updatedAt: updated.updatedAt } : r)),
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsApproving(false);
      setApproveError('Admin session token missing.');
      return;
    }

    try {
      const res = await adminApi.approvePatientRequest(token, targetId, targetUpdatedAt);
      setIsApproveModalOpen(false);
      setPostMutationRefreshError(null);

      // Stale response guard: only update details if still selected
      if (selectedRequestIdRef.current === targetId) {
        setSelectedDetail(res.request);
      }

      // Refresh list to update pending queue
      const listOk = await fetchList(true);
      if (!listOk) {
        setPostMutationRefreshError({
          message: 'Approved, but details could not be refreshed',
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
      const msg = err?.message || 'Failed to approve request.';
      if (status === 409) {
        setApproveError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(targetId);
        void fetchList(true);
      } else {
        setApproveError(msg);
      }
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Action
  const handleRejectConfirm = async () => {
    if (!selectedDetail) return;
    const targetId = selectedDetail.id;
    const targetUpdatedAt = selectedDetail.updatedAt;
    const cleanReason = rejectionReasonInput.trim();
    if (cleanReason.length < 3 || cleanReason.length > 300) {
      setRejectError('Rejection reason must be between 3 and 300 characters.');
      return;
    }

    setIsRejecting(true);
    setRejectError(null);

    if (isPreview) {
      setTimeout(() => {
        setIsRejecting(false);
        setIsRejectModalOpen(false);
        const updated: AdminPatientRequestDetail = {
          ...selectedDetail,
          status: 'rejected',
          rejectionReason: cleanReason,
          reviewedBy: {
            id: 'admin_preview',
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lifeline.lk',
          },
          reviewer: {
            id: 'admin_preview',
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lifeline.lk',
          },
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (selectedRequestIdRef.current === targetId) {
          setSelectedDetail(updated);
        }
        setRequests((prev) =>
          statusFilter === 'pending_verification'
            ? prev.filter((r) => r.id !== updated.id)
            : prev.map((r) =>
                r.id === updated.id
                  ? {
                      ...r,
                      status: 'rejected',
                      rejectionReason: cleanReason,
                      updatedAt: updated.updatedAt,
                    }
                  : r,
              ),
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsRejecting(false);
      setRejectError('Admin session token missing.');
      return;
    }

    try {
      const res = await adminApi.rejectPatientRequest(
        token,
        targetId,
        cleanReason,
        targetUpdatedAt,
      );
      setIsRejectModalOpen(false);
      setPostMutationRefreshError(null);

      // Stale response guard: only update details if still selected
      if (selectedRequestIdRef.current === targetId) {
        setSelectedDetail(res.request);
      }

      // Refresh list in place
      const listOk = await fetchList(true);
      if (!listOk) {
        setPostMutationRefreshError({
          message: 'Rejected, but details could not be refreshed',
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
      const msg = err?.message || 'Failed to reject request.';
      if (status === 409) {
        setRejectError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(targetId);
        void fetchList(true);
      } else {
        setRejectError(msg);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Delivery Assignment & Reassignment
  const handleAssignDeliverySubmit = async () => {
    if (!selectedDetail) return;
    const targetId = selectedDetail.id;
    const cleanName = deliveryPersonNameInput.trim();
    const cleanPhone = deliveryPhoneInput.trim().replace(/\s+/g, '');

    if (cleanName.length < 2 || cleanName.length > 100) {
      setAssignmentError('Delivery person name must be between 2 and 100 characters.');
      return;
    }

    if (!LK_PHONE_REGEX.test(cleanPhone)) {
      setAssignmentError('Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).');
      return;
    }

    const isReassign = Boolean(selectedDetail.deliveryAssignment && isReassigning);
    if (isReassign && !confirmReassignmentChecked) {
      setAssignmentError('Please check the confirmation box to confirm reassignment.');
      return;
    }

    setIsSubmittingAssignment(true);
    setAssignmentError(null);
    setAssignmentSuccessMsg(null);

    if (isPreview) {
      setTimeout(() => {
        setIsSubmittingAssignment(false);
        const newAssignment = {
          assignmentId: `asgn_prev_${Date.now()}`,
          deliveryPersonName: cleanName,
          contactPhone: cleanPhone,
          assignedAt: new Date().toISOString(),
          assignedBy: user?.name || 'Administrator',
          arrivalConfirmedAt: null,
          isArrivalConfirmed: false,
        };
        const updated: AdminPatientRequestDetail = {
          ...selectedDetail,
          deliveryAssignment: newAssignment,
          updatedAt: new Date().toISOString(),
        };
        if (selectedRequestIdRef.current === targetId) {
          setSelectedDetail(updated);
          setIsReassigning(false);
          setConfirmReassignmentChecked(false);
          setDeliveryPersonNameInput('');
          setDeliveryPhoneInput('');
          setAssignmentSuccessMsg(isReassign ? 'Delivery person re-assigned successfully!' : 'Delivery person assigned successfully!');
        }
        setRequests((prev) =>
          prev.map((r) =>
            r.id === updated.id
              ? {
                  ...r,
                  hasDeliveryAssignment: true,
                  deliveryPersonName: cleanName,
                  isArrivalConfirmed: false,
                  updatedAt: updated.updatedAt,
                }
              : r,
          ),
        );
      }, 500);
      return;
    }

    if (!token) {
      setIsSubmittingAssignment(false);
      setAssignmentError('Admin session token missing.');
      return;
    }

    try {
      const payload = {
        deliveryPersonName: cleanName,
        contactPhone: cleanPhone,
        ...(isReassign
          ? {
              expectedAssignmentId: selectedDetail.deliveryAssignment?.assignmentId,
              confirmReassignment: true,
            }
          : {}),
      };

      const res = await adminApi.assignDeliveryPerson(token, targetId, payload);
      setPostMutationRefreshError(null);

      // Stale response guard
      if (selectedRequestIdRef.current === targetId) {
        setSelectedDetail(res.request);
        setIsReassigning(false);
        setConfirmReassignmentChecked(false);
        setDeliveryPersonNameInput('');
        setDeliveryPhoneInput('');
        setAssignmentSuccessMsg(isReassign ? 'Delivery person re-assigned successfully!' : 'Delivery person assigned successfully!');
      }

      const listOk = await fetchList(true);
      if (!listOk) {
        setPostMutationRefreshError({
          message: isReassign
            ? 'Reassigned, but details could not be refreshed'
            : 'Assigned, but details could not be refreshed',
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
      const msg = err?.message || 'Failed to assign delivery person.';
      if (status === 409) {
        setAssignmentError(`Conflict: ${msg}. Refreshing details.`);
        void fetchDetail(targetId);
        void fetchList(true);
      } else {
        setAssignmentError(msg);
      }
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // Status visual badge styling
  const renderStatusBadge = (status: string) => {
    let bg = '#FEF3C7';
    let text = '#92400E';
    let border = '#FDE68A';
    let label = status;

    switch (status) {
      case 'pending_verification':
        label = 'Pending Review';
        bg = '#FEF3C7';
        text = '#92400E';
        border = '#FDE68A';
        break;
      case 'verified':
        label = 'Verified';
        bg = '#DCFCE7';
        text = '#166534';
        border = '#86EFAC';
        break;
      case 'in_progress':
        label = 'In Progress';
        bg = '#E0F2FE';
        text = '#0369A1';
        border = '#BAE6FD';
        break;
      case 'fulfilled':
        label = 'Fulfilled';
        bg = '#CCFBF1';
        text = '#0F766E';
        border = '#99F6E4';
        break;
      case 'rejected':
        label = 'Rejected';
        bg = '#FEE2E2';
        text = '#991B1B';
        border = '#FCA5A5';
        break;
      case 'cancelled':
        label = 'Cancelled';
        bg = '#F1F5F9';
        text = '#64748B';
        border = '#CBD5E1';
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{label}</Text>
      </View>
    );
  };

  // Status filter pill list
  const STATUS_TABS: { id: AdminRequestStatusFilter; label: string }[] = [
    { id: 'all', label: 'All Requests' },
    { id: 'pending_verification', label: 'Pending Review' },
    { id: 'verified', label: 'Verified' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'fulfilled', label: 'Fulfilled' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  // Render Left List Area
  const renderList = () => (
    <View style={styles.listContainer}>
      {/* Search and Filters Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.secondaryMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reference, patient, hospital..."
            placeholderTextColor={colors.secondaryMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            maxLength={50}
            returnKeyType="search"
          />
          {searchInput ? (
            <TouchableOpacity onPress={() => setSearchInput('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabsScroll}
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.statusTabBtn, isSelected && styles.statusTabBtnActive]}
                onPress={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusTabText, isSelected && styles.statusTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List Content */}
      {isLoadingList ? (
        <View style={styles.centerLoadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient requests...</Text>
        </View>
      ) : listError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
          <Text style={styles.errorText}>{listError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchList(true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="file-tray-outline" size={40} color={colors.secondaryMuted} />
          <Text style={styles.emptyTitle}>No Patient Requests Found</Text>
          <Text style={styles.emptySubtitle}>
            {debouncedSearch
              ? `No requests match "${debouncedSearch}". Try a different keyword.`
              : 'There are no patient blood requests matching the selected status filter.'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.cardsScroll} contentContainerStyle={styles.cardsScrollContent}>
          {requests.map((item) => {
            const isSelected = selectedRequestId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.requestCard,
                  isSelected && styles.requestCardSelected,
                ]}
                onPress={() => handleSelectRequest(item.id)}
                activeOpacity={0.75}
              >
                {/* Top Row: Blood Group, Ref ID, Status */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.bloodBadge}>
                    <Text style={styles.bloodBadgeText}>{item.bloodGroup}</Text>
                  </View>

                  <View style={styles.cardRefBlock}>
                    <Text style={styles.cardRefText} numberOfLines={1}>
                      {item.id}
                    </Text>
                    <Text style={styles.cardUnitsText}>
                      {item.unitsRequired} {item.unitsRequired === 1 ? 'unit' : 'units'} needed
                    </Text>
                  </View>

                  <View style={styles.cardStatusCol}>{renderStatusBadge(item.status)}</View>
                </View>

                {/* Patient and Hospital Row */}
                <View style={styles.cardBodyRow}>
                  <View style={styles.cardBodyLeft}>
                    <Text style={styles.cardPatientName}>{item.patientName}</Text>
                    <View style={styles.hospitalInfoRow}>
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <Text style={styles.hospitalNameText} numberOfLines={1}>
                        {item.hospitalName}
                      </Text>
                    </View>
                    {item.hospitalReferenceAndWard ? (
                      <Text style={styles.wardText} numberOfLines={1}>
                        {item.hospitalReferenceAndWard}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.cardBodyRight}>
                    <View
                      style={[
                        styles.urgencyBadge,
                        item.urgency === 'Urgent' ? styles.urgencyUrgent : styles.urgencyScheduled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.urgencyText,
                          item.urgency === 'Urgent' ? styles.urgencyTextUrgent : styles.urgencyTextScheduled,
                        ]}
                      >
                        {item.urgency}
                      </Text>
                    </View>
                    <Text style={styles.createdDateText}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>

                {/* Bottom Row: Delivery and Arrival Summary */}
                <View style={styles.cardFooterRow}>
                  {item.hasDeliveryAssignment ? (
                    <View style={styles.deliveryStatusRow}>
                      <Ionicons
                        name={item.isArrivalConfirmed ? 'shield-checkmark' : 'bicycle'}
                        size={14}
                        color={item.isArrivalConfirmed ? colors.success : colors.primary}
                      />
                      <Text
                        style={[
                          styles.deliveryStatusText,
                          item.isArrivalConfirmed && styles.deliveryStatusTextSuccess,
                        ]}
                      >
                        {item.isArrivalConfirmed
                          ? 'Requester Confirmed Arrival'
                          : `Delivery: ${item.deliveryPersonName || 'Assigned'}`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.deliveryStatusRow}>
                      <Ionicons name="alert-circle-outline" size={14} color={colors.secondaryMuted} />
                      <Text style={styles.deliveryStatusTextMuted}>No delivery contact assigned</Text>
                    </View>
                  )}

                  <View style={styles.detailsActionTag}>
                    <Text style={styles.detailsActionTagText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </View>
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
                <Text style={[styles.paginationBtnText, page <= 1 && styles.paginationBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageInfoText}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} requests)
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

  // Render Details & Actions Panel Content
  const renderDetailContent = () => {
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
        <View style={styles.detailErrorBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
          <Text style={styles.detailErrorText}>{detailError || 'Request details not available.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => selectedRequestId && fetchDetail(selectedRequestId)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const d = selectedDetail;
    const isPending = d.status === 'pending_verification';
    const isApprovedActive = d.status === 'verified' || d.status === 'in_progress';
    const hasAssignment = Boolean(d.deliveryAssignment);
    const hasConfirmedArrival = Boolean(d.deliveryAssignment?.arrivalConfirmedAt);

    return (
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderTop}>
            <View style={styles.detailHeaderLeft}>
              <Text style={styles.detailPatientName}>{d.patientName}</Text>
              <Text style={styles.detailRefId}>Ref: {d.id}</Text>
            </View>
            <TouchableOpacity style={styles.closeDetailBtn} onPress={handleCloseDetail} accessibilityLabel="Close details panel">
              <Ionicons name="close" size={20} color={colors.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.detailHeaderBadgeRow}>
            {renderStatusBadge(d.status)}
            <View
              style={[
                styles.urgencyBadge,
                d.urgency === 'Urgent' ? styles.urgencyUrgent : styles.urgencyScheduled,
              ]}
            >
              <Text
                style={[
                  styles.urgencyText,
                  d.urgency === 'Urgent' ? styles.urgencyTextUrgent : styles.urgencyTextScheduled,
                ]}
              >
                {d.urgency} Request
              </Text>
            </View>
          </View>
        </View>

        {/* Post-Mutation Refresh Error Notice */}
        {postMutationRefreshError ? (
          <View style={styles.refreshNoticeBanner}>
            <View style={styles.refreshNoticeContent}>
              <Ionicons name="warning-outline" size={20} color="#B45309" />
              <Text style={styles.refreshNoticeText}>{postMutationRefreshError.message}</Text>
            </View>
            <View style={styles.refreshNoticeActions}>
              <TouchableOpacity
                style={styles.refreshNoticeRetryBtn}
                onPress={postMutationRefreshError.onRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry refreshing details"
              >
                <Text style={styles.refreshNoticeRetryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshNoticeDismissBtn}
                onPress={() => setPostMutationRefreshError(null)}
                accessibilityLabel="Dismiss refresh notice"
              >
                <Ionicons name="close" size={16} color="#B45309" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Filter Navigation Notice when Request leaves pending list upon approval */}
        {statusFilter === 'pending_verification' && d.status === 'verified' ? (
          <View style={styles.filterMovedBanner}>
            <View style={styles.filterMovedHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#15803D" />
              <Text style={styles.filterMovedTitle}>Request Approved &amp; Verified</Text>
            </View>
            <Text style={styles.filterMovedSubtitle}>
              This request is now verified and has moved out of the Pending Verification queue. You can assign a delivery person below, or switch the list filter to Verified.
            </Text>
            <View style={styles.filterMovedActionRow}>
              <TouchableOpacity
                style={styles.switchFilterBtn}
                onPress={() => {
                  setStatusFilter('verified');
                  setPage(1);
                }}
              >
                <Text style={styles.switchFilterBtnText}>Switch List to Verified</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeDetailTextBtn}
                onPress={handleCloseDetail}
              >
                <Text style={styles.closeDetailTextBtnText}>Close Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Section 1: Clinical Request Details */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionTitle}>REQUEST INFORMATION</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Blood Group</Text>
              <View style={styles.bloodBadgeSmall}>
                <Text style={styles.bloodBadgeSmallText}>{d.bloodGroup}</Text>
              </View>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Units Needed</Text>
              <Text style={styles.infoValue}>
                {d.unitsRequired} {d.unitsRequired === 1 ? 'Unit' : 'Units'}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Fulfilled</Text>
              <Text style={styles.infoValue}>{d.unitsFulfilled} Units</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Hospital</Text>
            <Text style={styles.infoValue}>{d.hospitalName}</Text>
          </View>

          {d.hospitalReferenceAndWard ? (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Ward / Reference</Text>
              <Text style={styles.infoValue}>{d.hospitalReferenceAndWard}</Text>
            </View>
          ) : null}

          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Submitted Date</Text>
            <Text style={styles.infoValue}>{formatDate(d.createdAt)}</Text>
          </View>

          {d.reviewedAt ? (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Reviewed Date</Text>
              <Text style={styles.infoValue}>{formatDate(d.reviewedAt)}</Text>
            </View>
          ) : null}
        </View>

        {/* Section 2: Requester Identity (Safe Fields Only) */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionTitle}>REQUESTER CONTACT</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{d.requester?.name || 'Requester Unavailable'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{d.requester?.email || '—'}</Text>
          </View>
          {d.requester?.phone ? (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Contact Phone</Text>
              <Text style={styles.infoValue}>{d.requester.phone}</Text>
            </View>
          ) : null}
          {d.requester?.district ? (
            <View style={styles.fieldRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {d.requester.district}
                {d.requester.city ? `, ${d.requester.city}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 3: Uploaded Document & Safe Stream */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionTitle}>HOSPITAL VERIFICATION DOCUMENT</Text>

          <View style={styles.docInfoBox}>
            <View style={styles.docIconCircle}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <View style={styles.docDetailsCol}>
              <Text style={styles.docName} numberOfLines={1}>
                {d.document.originalName}
              </Text>
              <Text style={styles.docSize}>
                {(d.document.sizeBytes / 1024).toFixed(1)} KB • {d.document.mimeType}
              </Text>
            </View>
          </View>

          {docError ? (
            <View style={styles.inlineErrorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.inlineErrorText}>{docError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.downloadDocBtn}
            onPress={handleViewOrDownloadDocument}
            disabled={isDownloadingDoc}
            activeOpacity={0.8}
          >
            {isDownloadingDoc ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.downloadDocBtnText}>
              {isDownloadingDoc ? 'Downloading Document...' : 'View / Download Document'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.docGuidanceText}>
            Notice: Review document authenticity before taking action. Viewing this document does not automatically approve the request.
          </Text>
        </View>

        {/* Section 4: Approve / Reject Actions (Only for pending_verification) */}
        {isPending && (
          <View style={styles.actionsSectionCard}>
            <Text style={styles.sectionTitle}>REVIEW ACTIONS</Text>
            <Text style={styles.actionGuidanceText}>
              Carefully evaluate the uploaded document and patient requirement. Choose to approve for donor matching or reject with an explicit reason.
            </Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => setIsApproveModalOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.approveBtnText}>Approve Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => {
                  setRejectionReasonInput('');
                  setRejectError(null);
                  setIsRejectModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.rejectBtnText}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section 5: Delivery Person Assignment & Reassignment (Only for verified / in_progress) */}
        {isApprovedActive && (
          <View style={styles.detailSectionCard}>
            <Text style={styles.sectionTitle}>DELIVERY PERSON ASSIGNMENT</Text>

            {assignmentSuccessMsg ? (
              <View style={styles.successAlertBox}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.successAlertText}>{assignmentSuccessMsg}</Text>
              </View>
            ) : null}

            {assignmentError ? (
              <View style={styles.inlineErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.inlineErrorText}>{assignmentError}</Text>
              </View>
            ) : null}

            {hasAssignment ? (
              <View style={styles.currentAssignmentBox}>
                <View style={styles.assignmentHeaderRow}>
                  <Text style={styles.assignmentTitle}>Current Delivery Contact</Text>
                  {hasConfirmedArrival ? (
                    <View style={styles.arrivedBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#166534" />
                      <Text style={styles.arrivedBadgeText}>Arrival Confirmed</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingArrivalBadge}>
                      <Ionicons name="time-outline" size={12} color="#92400E" />
                      <Text style={styles.pendingArrivalBadgeText}>Awaiting Arrival</Text>
                    </View>
                  )}
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.infoLabel}>Delivery Person</Text>
                  <Text style={styles.infoValue}>{d.deliveryAssignment!.deliveryPersonName}</Text>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.infoLabel}>Contact Phone</Text>
                  <Text style={styles.infoValue}>{d.deliveryAssignment!.contactPhone}</Text>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.infoLabel}>Assigned At</Text>
                  <Text style={styles.infoValue}>{formatDate(d.deliveryAssignment!.assignedAt)}</Text>
                </View>

                {/* Requester-reported arrival information */}
                {hasConfirmedArrival ? (
                  <View style={styles.arrivalConfirmationNotice}>
                    <Ionicons name="checkmark-circle" size={18} color="#166534" />
                    <View style={styles.arrivalTextCol}>
                      <Text style={styles.arrivalTitle}>Requester-Confirmed Arrival</Text>
                      <Text style={styles.arrivalTimestamp}>
                        Confirmed by requester on {formatDate(d.deliveryAssignment!.arrivalConfirmedAt)}
                      </Text>
                      <Text style={styles.arrivalDisclaimer}>
                        Note: This confirms delivery contact arrival at hospital, not clinical blood receipt or fulfillment. Reassignment is disabled for confirmed arrivals.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {!isReassigning ? (
                      <TouchableOpacity
                        style={styles.reassignToggleBtn}
                        onPress={() => {
                          setIsReassigning(true);
                          setDeliveryPersonNameInput('');
                          setDeliveryPhoneInput('');
                          setConfirmReassignmentChecked(false);
                          setAssignmentError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="swap-horizontal" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.reassignToggleBtnText}>Reassign Delivery Person</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.noAssignmentNotice}>
                This blood request is verified. Assign a delivery person below to coordinate blood transport.
              </Text>
            )}

            {/* Assignment or Reassignment Form */}
            {(!hasAssignment || (isReassigning && !hasConfirmedArrival)) && (
              <View style={styles.assignmentForm}>
                <Text style={styles.formSectionHeader}>
                  {isReassigning ? 'Reassign Delivery Person' : 'Assign Delivery Person'}
                </Text>

                {isReassigning && (
                  <View style={styles.reassignmentWarningBox}>
                    <Ionicons name="warning-outline" size={18} color="#B45309" />
                    <Text style={styles.reassignmentWarningText}>
                      Reassignment will invalidate the previous assignment. If the requester confirms arrival in the meantime, reassignment will fail.
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Delivery Person Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kasun Wickramasinghe"
                  placeholderTextColor={colors.secondaryMuted}
                  value={deliveryPersonNameInput}
                  onChangeText={setDeliveryPersonNameInput}
                  maxLength={100}
                />

                <Text style={styles.inputLabel}>Contact Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 0771234567 or +94771234567"
                  placeholderTextColor={colors.secondaryMuted}
                  value={deliveryPhoneInput}
                  onChangeText={setDeliveryPhoneInput}
                  keyboardType="phone-pad"
                  maxLength={15}
                />

                {isReassigning && (
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setConfirmReassignmentChecked(!confirmReassignmentChecked)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={confirmReassignmentChecked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={confirmReassignmentChecked ? colors.primary : colors.secondaryMuted}
                    />
                    <Text style={styles.checkboxLabel}>
                      I confirm replacing the current active delivery person.
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.formBtnRow}>
                  {isReassigning && (
                    <TouchableOpacity
                      style={styles.formCancelBtn}
                      onPress={() => {
                        setIsReassigning(false);
                        setAssignmentError(null);
                      }}
                      disabled={isSubmittingAssignment}
                    >
                      <Text style={styles.formCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.formSubmitBtn, isSubmittingAssignment && styles.btnDisabled]}
                    onPress={handleAssignDeliverySubmit}
                    disabled={isSubmittingAssignment}
                    activeOpacity={0.85}
                  >
                    {isSubmittingAssignment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={isReassigning ? 'swap-horizontal' : 'bicycle'}
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text style={styles.formSubmitBtnText}>
                      {isSubmittingAssignment
                        ? 'Saving...'
                        : isReassigning
                        ? 'Confirm Reassignment'
                        : 'Assign Delivery Person'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Section 6: Rejection Details (Only if status === rejected) */}
        {d.status === 'rejected' && (
          <View style={styles.detailSectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>REJECTION AUDIT RECORD</Text>
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionReasonLabel}>Reason for Rejection:</Text>
              <Text style={styles.rejectionReasonContent}>{d.rejectionReason || 'No reason specified.'}</Text>
              {d.reviewedBy || d.reviewer ? (
                <Text style={styles.reviewerAuditText}>
                  Reviewed by{' '}
                  {typeof d.reviewedBy === 'object' && d.reviewedBy
                    ? d.reviewedBy.name
                    : d.reviewer?.name || d.reviewedBy || 'Administrator'}{' '}
                  on {formatDate(d.reviewedAt)}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Patient Requests Management</Text>
            <Text style={styles.headerSubtitle}>
              Review patient blood requisitions, inspect medical verification files, and assign hospital transport.
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => fetchList(true)}
              disabled={isLoadingList || isRefreshingList}
              activeOpacity={0.7}
              accessibilityLabel="Refresh requests list"
            >
              <Ionicons
                name="refresh"
                size={16}
                color={colors.secondary}
                style={isRefreshingList ? styles.rotatingIcon : undefined}
              />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <View style={styles.switcherWrapper}>
                <ScreenSwitcher currentScreenId={30} />
              </View>
            )}
          </View>
        </View>

        {/* Main Content Layout: Desktop Side-by-Side vs Mobile List Only */}
        <View style={styles.bodyLayout}>
          {/* Main List Area */}
          <View style={[styles.leftColumn, isDesktop && selectedRequestId && styles.leftColumnWithPanel]}>
            {renderList()}
          </View>

          {/* Desktop Right Side Panel */}
          {isDesktop && selectedRequestId && (
            <View style={styles.desktopSidePanel}>
              {renderDetailContent()}
            </View>
          )}
        </View>

        {/* Mobile Full-Screen Modal for Selected Request (width < 992) */}
        {!isDesktop && (
          <Modal
            visible={Boolean(selectedRequestId)}
            animationType="slide"
            onRequestClose={handleCloseDetail}
            presentationStyle="pageSheet"
          >
            <View style={styles.mobileModalRoot}>
              <View style={styles.mobileModalTopBar}>
                <TouchableOpacity onPress={handleCloseDetail} style={styles.mobileBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={colors.secondary} />
                  <Text style={styles.mobileBackBtnText}>Back to List</Text>
                </TouchableOpacity>
                <Text style={styles.mobileModalHeaderTitle}>Request Details</Text>
              </View>
              {renderDetailContent()}
            </View>
          </Modal>
        )}

        {/* APPROVE CONFIRMATION MODAL */}
        <Modal
          visible={isApproveModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => !isApproving && setIsApproveModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalDialogCard}>
              <View style={styles.dialogHeader}>
                <View style={styles.dialogIconCircleApprove}>
                  <Ionicons name="shield-checkmark" size={28} color="#166534" />
                </View>
                <Text style={styles.dialogTitle}>Approve Blood Request?</Text>
                <Text style={styles.dialogSubtitle}>
                  You are verifying the requisition for{' '}
                  <Text style={{ fontWeight: '700' }}>{selectedDetail?.patientName}</Text> (
                  {selectedDetail?.unitsRequired} units {selectedDetail?.bloodGroup}).
                </Text>
              </View>

              <Text style={styles.dialogWarningNotice}>
                Approving will transition status to <Text style={{ fontWeight: '700' }}>verified</Text>. Nearby matching donors will become eligible to see this request. No delivery assignment or notification is triggered automatically.
              </Text>

              {approveError ? (
                <View style={styles.inlineErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.inlineErrorText}>{approveError}</Text>
                </View>
              ) : null}

              <View style={styles.dialogBtnRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsApproveModalOpen(false)}
                  disabled={isApproving}
                >
                  <Text style={styles.dialogCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogApproveBtn, isApproving && styles.btnDisabled]}
                  onPress={handleApproveConfirm}
                  disabled={isApproving}
                  activeOpacity={0.85}
                >
                  {isApproving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogApproveBtnText}>Confirm Approval</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* REJECT CONFIRMATION MODAL */}
        <Modal
          visible={isRejectModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => !isRejecting && setIsRejectModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalDialogCard}>
              <View style={styles.dialogHeader}>
                <View style={styles.dialogIconCircleReject}>
                  <Ionicons name="close-circle" size={28} color={colors.danger} />
                </View>
                <Text style={styles.dialogTitle}>Reject Blood Request</Text>
                <Text style={styles.dialogSubtitle}>
                  Please specify why this request cannot be approved. The reason will be visible to the requester in their My Requests history.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Rejection Reason (Required, 3–300 characters) *</Text>
              <TextInput
                style={styles.rejectionTextArea}
                placeholder="e.g. Uploaded document is missing the hospital medical officer stamp and date."
                placeholderTextColor={colors.secondaryMuted}
                value={rejectionReasonInput}
                onChangeText={setRejectionReasonInput}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
              <Text style={styles.charCountText}>{rejectionReasonInput.length}/300 characters</Text>

              {rejectError ? (
                <View style={styles.inlineErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.inlineErrorText}>{rejectError}</Text>
                </View>
              ) : null}

              <View style={styles.dialogBtnRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsRejectModalOpen(false)}
                  disabled={isRejecting}
                >
                  <Text style={styles.dialogCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogRejectBtn, isRejecting && styles.btnDisabled]}
                  onPress={handleRejectConfirm}
                  disabled={isRejecting}
                  activeOpacity={0.85}
                >
                  {isRejecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogRejectBtnText}>Confirm Rejection</Text>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondarySoft,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  rotatingIcon: {
    opacity: 0.6,
  },
  switcherWrapper: {
    alignSelf: 'center',
  },
  bodyLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnWithPanel: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  desktopSidePanel: {
    flex: 1,
    maxWidth: 480,
    backgroundColor: colors.card,
  },
  mobileModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mobileModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  mobileBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  mobileBackBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  mobileModalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
    marginLeft: spacing.md,
  },

  // List Container Styles
  listContainer: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.secondary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  statusTabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  statusTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondarySoft,
  },
  statusTabBtnActive: {
    backgroundColor: colors.primary,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  cardsScroll: {
    flex: 1,
  },
  cardsScrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  centerLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondaryMuted,
  },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },

  // Card Styles
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  requestCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFBFB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bloodBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  cardRefBlock: {
    flex: 1,
  },
  cardRefText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  cardUnitsText: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  cardStatusCol: {
    alignItems: 'flex-end',
  },
  cardBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardBodyLeft: {
    flex: 1,
  },
  cardPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 2,
  },
  hospitalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hospitalNameText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
    flex: 1,
  },
  wardText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginLeft: 18,
  },
  cardBodyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
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
    color: colors.primary,
  },
  urgencyTextScheduled: {
    color: colors.info,
  },
  createdDateText: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deliveryStatusTextSuccess: {
    color: colors.success,
  },
  deliveryStatusTextMuted: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  detailsActionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsActionTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Pagination Styles
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paginationBtnDisabled: {
    opacity: 0.45,
  },
  paginationBtnText: {
    fontSize: 13,
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

  // Details Panel Styles
  detailScroll: {
    flex: 1,
    backgroundColor: colors.card,
  },
  detailScrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailLoadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  detailErrorBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailErrorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  detailHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailHeaderLeft: {
    flex: 1,
  },
  detailPatientName: {
    fontSize: 18,
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
  detailHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailSectionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 2,
  },
  bloodBadgeSmall: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  bloodBadgeSmallText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  // Document Box Styles
  docInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docDetailsCol: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  docSize: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginTop: 1,
  },
  downloadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    marginTop: spacing.xs,
  },
  downloadDocBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docGuidanceText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    lineHeight: 15,
    marginTop: 4,
  },

  // Review Actions Styles
  actionsSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
  },
  actionGuidanceText: {
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 17,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Delivery Assignment Styles
  noAssignmentNotice: {
    fontSize: 12,
    color: colors.secondaryMuted,
    lineHeight: 17,
  },
  currentAssignmentBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assignmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  arrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  arrivedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  pendingArrivalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pendingArrivalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  arrivalConfirmationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: spacing.xs,
  },
  arrivalTextCol: {
    flex: 1,
  },
  arrivalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  arrivalTimestamp: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  arrivalDisclaimer: {
    fontSize: 10,
    color: '#166534',
    marginTop: 4,
    lineHeight: 14,
  },
  reassignToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
  },
  reassignToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  assignmentForm: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  formSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  reassignmentWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.xs,
  },
  reassignmentWarningText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.secondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.secondary,
    flex: 1,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  formCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondarySoft,
    justifyContent: 'center',
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  formSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  formSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Rejection Details Styles
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
  },
  rejectionReasonContent: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  reviewerAuditText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    marginTop: 4,
  },

  // Alerts and Modals
  successAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: spacing.xs,
  },
  successAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: 4,
  },
  inlineErrorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalDialogCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  dialogHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dialogIconCircleApprove: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dialogIconCircleReject: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
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
  dialogWarningNotice: {
    fontSize: 12,
    color: colors.secondary,
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    lineHeight: 17,
  },
  rejectionTextArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.secondary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCountText: {
    fontSize: 11,
    color: colors.secondaryMuted,
    alignSelf: 'flex-end',
  },
  dialogBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondarySoft,
  },
  dialogCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  dialogApproveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
  },
  dialogApproveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialogRejectBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger,
  },
  dialogRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Post-Mutation Refresh Error Banner Styles
  refreshNoticeBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
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
    paddingVertical: 5,
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

  // Filter Moved Notice Banner
  filterMovedBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterMovedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterMovedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  filterMovedSubtitle: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
  },
  filterMovedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  switchFilterBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  switchFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeDetailTextBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: '#DCFCE7',
  },
  closeDetailTextBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
});
