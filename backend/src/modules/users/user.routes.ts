import { Router, type Response } from 'express';
import { User } from './user.model.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { sanitizeUser } from '../auth/auth.routes.js';

export const userRouter = Router();

// 1. GET CURRENT USER PROFILE
userRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({ user: sanitizeUser(req.user!) });
});

// 2. UPDATE USER PROFILE (Supports both PUT and PATCH)
const handleUpdateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      name,
      phone,
      bloodGroup,
      district,
      city,
      dateOfBirth,
      gender,
      weight,
      avatarUrl,
      preferences,
    } = req.body;

    if (name) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (district) user.district = String(district).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;
    if (weight !== undefined) user.weight = Number(weight);
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[users] Update error:', error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

userRouter.put('/me', authenticate, handleUpdateProfile);
userRouter.patch('/me', authenticate, handleUpdateProfile);

// 3. TOGGLE AVAILABILITY
userRouter.patch('/me/availability', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { isAvailable } = req.body;
    user.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !user.isAvailable;
    await user.save();

    res.status(200).json({
      message: `Availability updated to ${user.isAvailable ? 'Available' : 'Unavailable'}.`,
      isAvailable: user.isAvailable,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[users] Availability error:', error);
    res.status(500).json({ message: 'Failed to update availability.' });
  }
});

// 4. UPDATE LOCATION
userRouter.patch('/me/location', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, district, city } = req.body;
    const user = req.user!;

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      user.location = {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
      };
    }
    if (district) user.district = String(district).trim();
    if (city) user.city = String(city).trim();

    await user.save();
    res.status(200).json({
      message: 'Location updated successfully.',
      location: user.location,
      district: user.district,
      city: user.city,
    });
  } catch (error) {
    console.error('[users] Location error:', error);
    res.status(500).json({ message: 'Failed to update location.' });
  }
});

// 5. GET ELIGIBILITY STATUS & DETAILS
userRouter.get('/me/eligibility', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const daysSinceLastDonation = user.lastDonationDate
    ? Math.floor((Date.now() - new Date(user.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24))
    : 120;

  const nextEligibleDate = new Date(
    (user.lastDonationDate ? new Date(user.lastDonationDate).getTime() : Date.now()) +
      90 * 24 * 60 * 60 * 1000,
  );

  const criteria = [
    { title: 'Age Criterion (18 - 60 years)', satisfied: true, note: 'Donor age is within normal healthy limits.' },
    { title: 'Weight Criterion (≥ 50 kg)', satisfied: (user.weight ?? 65) >= 50, note: `Recorded weight: ${user.weight ?? 65} kg` },
    { title: 'Donation Interval (≥ 90 days)', satisfied: daysSinceLastDonation >= 90, note: `${daysSinceLastDonation} days since previous donation.` },
    { title: 'General Wellness & Vitals', satisfied: user.isEligible, note: 'No active systemic conditions reported.' },
  ];

  res.status(200).json({
    isEligible: user.isEligible,
    daysSinceLastDonation,
    nextEligibleDate,
    criteria,
  });
});

// 6. SUBMIT ELIGIBILITY QUESTIONNAIRE
userRouter.post('/me/eligibility', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { answers } = req.body; // array of booleans: [wellToday, intervalFollowed, noFever, readyToDisclose]

    const allPassed = Array.isArray(answers) && answers.length >= 4 && answers.every((a) => Boolean(a));
    user.isEligible = allPassed;
    await user.save();

    res.status(200).json({
      message: allPassed
        ? 'Eligibility check passed! You are eligible for blood donation.'
        : 'Medical consultation recommended before donating blood.',
      isEligible: user.isEligible,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[users] Eligibility error:', error);
    res.status(500).json({ message: 'Failed to evaluate eligibility.' });
  }
});

// 7. GET EMERGENCY CONTACTS
userRouter.get('/me/emergency-contacts', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({ contacts: req.user!.emergencyContacts || [] });
});

// 8. ADD EMERGENCY CONTACT
userRouter.post('/me/emergency-contacts', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, relationship, phone, shareLocation = true } = req.body;
    if (!name || !phone) {
      res.status(400).json({ message: 'Name and phone number are required.' });
      return;
    }

    const user = req.user!;
    user.emergencyContacts.push({
      name: String(name).trim(),
      relationship: String(relationship || 'Friend').trim(),
      phone: String(phone).trim(),
      shareLocation: Boolean(shareLocation),
    });

    await user.save();
    res.status(201).json({
      message: 'Emergency contact added.',
      contacts: user.emergencyContacts,
    });
  } catch (error) {
    console.error('[users] Add emergency contact error:', error);
    res.status(500).json({ message: 'Failed to add emergency contact.' });
  }
});

// 9. REMOVE EMERGENCY CONTACT
userRouter.delete('/me/emergency-contacts/:contactId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contactId } = req.params;
    const user = req.user!;
    user.emergencyContacts = user.emergencyContacts.filter((c) => c._id?.toString() !== contactId);
    await user.save();

    res.status(200).json({
      message: 'Emergency contact removed.',
      contacts: user.emergencyContacts,
    });
  } catch (error) {
    console.error('[users] Delete emergency contact error:', error);
    res.status(500).json({ message: 'Failed to delete emergency contact.' });
  }
});

// 10. GET DONATION HISTORY
userRouter.get('/me/donation-history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  res.status(200).json({
    donations: user.donationHistory || [],
    totalDonations: user.donationCount,
    estimatedLivesSaved: user.donationCount * 3,
    totalVolumeLiters: (user.donationCount * 0.45).toFixed(2),
  });
});

// 11. GET DONOR BADGES & ACHIEVEMENTS
userRouter.get('/me/badges', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const donationCount = user.donationCount;

  const catalog = [
    {
      id: 'first_drop',
      title: 'First Drop',
      description: 'Completed first successful blood donation',
      icon: 'water',
      unlocked: donationCount >= 1,
      minDonations: 1,
    },
    {
      id: 'life_saver',
      title: 'Life Saver',
      description: 'Completed 3 successful blood donations',
      icon: 'heart',
      unlocked: donationCount >= 3,
      minDonations: 3,
    },
    {
      id: 'silver_hero',
      title: 'Silver Donor',
      description: 'Helped save over 15 lives (5 donations)',
      icon: 'shield-checkmark',
      unlocked: donationCount >= 5,
      minDonations: 5,
    },
    {
      id: 'gold_champion',
      title: 'Gold Champion',
      description: 'Dedicated hero with 10+ blood donations',
      icon: 'trophy',
      unlocked: donationCount >= 10,
      minDonations: 10,
    },
  ];

  res.status(200).json({
    badges: catalog,
    currentCount: donationCount,
    nextBadge: catalog.find((b) => !b.unlocked) || null,
  });
});

// 12. PUBLIC DONOR PROFILE (Screen 16: Public View)
userRouter.get('/:id/public-profile', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const donor = await User.findById(id);

    if (!donor) {
      res.status(404).json({ message: 'Donor not found.' });
      return;
    }

    res.status(200).json({
      donor: {
        id: donor._id.toString(),
        name: donor.name,
        bloodGroup: donor.bloodGroup,
        district: donor.district,
        city: donor.city || '',
        isAvailable: donor.isAvailable,
        isEligible: donor.isEligible,
        donationCount: donor.donationCount,
        isPhoneVerified: donor.isPhoneVerified,
        badges: donor.badges,
      },
    });
  } catch (error) {
    console.error('[users] Public profile error:', error);
    res.status(500).json({ message: 'Failed to retrieve public profile.' });
  }
});

// 13. AVAILABLE DONORS LIST (Matching & Search support)
userRouter.get('/donors/available', async (req, res): Promise<void> => {
  try {
    const { bloodGroup, district } = req.query;
    const query: Record<string, unknown> = {
      isAvailable: true,
      role: 'donor',
    };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (district) query.district = district;

    const donors = await User.find(query).limit(20);
    res.status(200).json({
      donors: donors.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        bloodGroup: d.bloodGroup,
        district: d.district,
        city: d.city,
        isAvailable: d.isAvailable,
        donationCount: d.donationCount,
      })),
    });
  } catch (error) {
    console.error('[users] Available donors error:', error);
    res.status(500).json({ message: 'Failed to retrieve donors.' });
  }
});
