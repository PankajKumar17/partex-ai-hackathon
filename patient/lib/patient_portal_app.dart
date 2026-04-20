import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import 'services/patient_api_service.dart';
import 'widgets/qr_code_card.dart';
import 'widgets/vitals_line_chart.dart';

class AppColors {
  static const Color primary = Color(0xFF00488D);
  static const Color accent = Color(0xFF005FB8);
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color text = Color(0xFF1F2937);
  static const Color muted = Color(0xFF6B7280);
  static const Color border = Color(0xFFDCE6F2);
  static const Color danger = Color(0xFFE24C4B);
  static const Color warning = Color(0xFFF2994A);
  static const Color success = Color(0xFF2E8B57);
}

class PatientPortalApp extends StatelessWidget {
  const PatientPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseText = ThemeData.light().textTheme;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Patient Portal',
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          secondary: AppColors.accent,
          surface: AppColors.surface,
          error: AppColors.danger,
        ),
        textTheme: baseText.apply(
          bodyColor: AppColors.text,
          displayColor: AppColors.text,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: const Color(0x1FD6E3FF),
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w500,
              color: states.contains(WidgetState.selected)
                  ? AppColors.text
                  : AppColors.muted,
              fontSize: 12,
            ),
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
          ),
        ),
      ),
      routes: {
        LoginScreen.routeName: (_) => const LoginScreen(),
        PatientShellScreen.routeName: (_) => const PatientShellScreen(),
      },
      onGenerateRoute: (settings) {
        final name = settings.name ?? '';
        if (name.startsWith('/emergency/')) {
          final token = name.replaceFirst('/emergency/', '').trim();
          return MaterialPageRoute<void>(
            builder: (_) => EmergencyScreen(token: token),
          );
        }
        if (settings.name == EmergencyScreen.routeName) {
          final token = settings.arguments is String
              ? settings.arguments! as String
              : '';
          return MaterialPageRoute<void>(
            builder: (_) => EmergencyScreen(token: token),
          );
        }
        return null;
      },
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final active = await _api.isAuthenticated();
    if (!mounted) {
      return;
    }
    setState(() {
      _isLoggedIn = active;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_isLoggedIn) {
      return const PatientShellScreen();
    }

    return const LoginScreen();
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  static const String routeName = '/login';

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final PatientApiService _api = PatientApiService.instance;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (!_looksLikeEmail(email)) {
      setState(() {
        _error = 'Please enter a valid email address.';
      });
      return;
    }

    if (password.length < 6) {
      setState(() {
        _error = 'Please enter your password.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.loginWithEmailPassword(email, password);
      final token = response['token'] ?? response['access_token'];
      final patientId =
          response['patient_id'] ??
          (_asMap(response['patient'])['patient_id']) ??
          (_asMap(response['session'])['patient_id']);
      final loggedIn = await _api.isAuthenticated();

      if (!mounted) {
        return;
      }

      if (patientId != null || token != null || loggedIn) {
        Navigator.of(
          context,
        ).pushReplacementNamed(PatientShellScreen.routeName);
      } else {
        setState(() {
          _error = 'Login response did not include patient session data.';
        });
      }
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Login failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  bool _looksLikeEmail(String value) {
    if (value.isEmpty) {
      return false;
    }
    final pattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    return pattern.hasMatch(value);
  }

  @override
  Widget build(BuildContext context) {
    final authCard = Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Secure Sign In',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'Access your patient records with your clinical credentials.',
              style: TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 22),
            const Text(
              'Email Address',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autocorrect: false,
              decoration: const InputDecoration(
                hintText: 'clinician@hospital.org',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Password',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) {
                if (!_loading) {
                  _submitLogin();
                }
              },
              decoration: InputDecoration(
                hintText: 'Enter your password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            _PrimaryButton(
              icon: Icons.login_rounded,
              text: _loading ? 'Signing In...' : 'Sign In',
              onPressed: _loading ? null : _submitLogin,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: Color(0xFFB91C1C),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 14),
            const Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MiniTrustChip(
                  icon: Icons.verified_user_rounded,
                  label: 'HIPAA Compliant',
                ),
                _MiniTrustChip(
                  icon: Icons.enhanced_encryption_rounded,
                  label: 'AES-256',
                ),
                _MiniTrustChip(icon: Icons.lock_rounded, label: 'SOC2'),
              ],
            ),
          ],
        ),
      ),
    );

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 980;

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: 24,
                vertical: isWide ? 24 : 18,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1160),
                  child: isWide
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Clinical Portal',
                                    style: TextStyle(
                                      color: AppColors.primary,
                                      fontSize: 46,
                                      height: 1.05,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  SizedBox(height: 14),
                                  Text(
                                    'Precision healthcare management for patients. Review records, vitals, medications, and clinical history from one secure workspace.',
                                    style: TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 16,
                                      height: 1.5,
                                    ),
                                  ),
                                  SizedBox(height: 24),
                                ],
                              ),
                            ),
                            const SizedBox(width: 38),
                            SizedBox(width: 430, child: authCard),
                          ],
                        )
                      : ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 460),
                          child: authCard,
                        ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class PatientShellScreen extends StatefulWidget {
  const PatientShellScreen({super.key});

  static const String routeName = '/app';

  @override
  State<PatientShellScreen> createState() => _PatientShellScreenState();
}

class _PatientShellScreenState extends State<PatientShellScreen> {
  final PatientApiService _api = PatientApiService.instance;

  int _tabIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomeScreen(onOpenTab: _switchTab, onLogout: _logout),
      const HealthPassportScreen(),
      const RecordsScreen(),
      const MedicationsScreen(),
      const VitalsScreen(),
    ];
  }

  Future<void> _logout() async {
    await _api.logout();
    if (!mounted) {
      return;
    }
    Navigator.of(context).pushReplacementNamed(LoginScreen.routeName);
  }

  void _switchTab(int index) {
    setState(() {
      _tabIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final destinations = const [
      NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Home'),
      NavigationDestination(icon: Icon(Icons.badge_rounded), label: 'Passport'),
      NavigationDestination(icon: Icon(Icons.folder_rounded), label: 'Records'),
      NavigationDestination(
        icon: Icon(Icons.medication_rounded),
        label: 'Meds',
      ),
      NavigationDestination(
        icon: Icon(Icons.monitor_heart_rounded),
        label: 'Vitals',
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: _tabIndex, children: _pages),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x141A1C1C),
                  blurRadius: 28,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: NavigationBar(
                selectedIndex: _tabIndex,
                onDestinationSelected: _switchTab,
                height: 70,
                backgroundColor: Colors.transparent,
                indicatorColor: const Color(0x1FD6E3FF),
                destinations: destinations,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.onOpenTab,
    required this.onLogout,
  });

  final ValueChanged<int> onOpenTab;
  final Future<void> Function() onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  bool _processingConsultation = false;
  bool _flaggingVisit = false;
  String? _error;
  String? _consultationError;
  Map<String, dynamic> _data = <String, dynamic>{};
  Map<String, dynamic> _consultationResult = <String, dynamic>{};
  String? _patientName;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getOverview();
      final name = await _api.getPatientName();
      if (!mounted) {
        return;
      }
      setState(() {
        _data = response;
        _patientName = name;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _recordConsultation() async {
    final patientCode = _safeText(_asMap(_data['patient'])['patient_id']);
    if (patientCode.isEmpty) {
      setState(() {
        _consultationError =
            'Patient code is missing. Refresh the page and try again.';
      });
      return;
    }

    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const [
        'wav',
        'mp3',
        'webm',
        'ogg',
        'm4a',
        'aac',
        'flac',
      ],
      withData: true,
    );

    if (picked == null || picked.files.isEmpty) {
      return;
    }

    final file = picked.files.single;
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) {
      setState(() {
        _consultationError =
            'Could not read this audio file. Please select another file.';
      });
      return;
    }

    setState(() {
      _processingConsultation = true;
      _consultationError = null;
    });

    try {
      final result = await _api.processConsultationAudio(
        patientCode: patientCode,
        audioBytes: bytes,
        fileName: file.name,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _consultationResult = result;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Consultation processed successfully.')),
      );

      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _consultationError = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _consultationError = 'Could not process consultation audio.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _processingConsultation = false;
        });
      }
    }
  }

  Future<void> _flagConsultationVisit() async {
    final visitId = _safeText(_consultationResult['visit_id']);
    if (visitId.isEmpty) {
      return;
    }

    setState(() {
      _flaggingVisit = true;
      _consultationError = null;
    });

    try {
      final result = await _api.flagVisitForReview(visitId);
      final needsReview = result['needs_review'] == true;

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            needsReview
                ? 'Visit flagged for doctor review.'
                : 'Review flag removed.',
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _consultationError = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _flaggingVisit = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = _asMap(_data['patient']);
    final riskLevel = (_data['risk_level'] ?? 'LOW').toString().toUpperCase();
    final lastVisit = _asMap(_data['last_visit']);
    final hasConsultation = _consultationResult.isNotEmpty;
    final consultationVisitId = _safeText(_consultationResult['visit_id']);
    final consultationRisk = _safeText(
      _consultationResult['risk_level'],
    ).toUpperCase();
    final consultationChiefComplaint = _safeText(
      _consultationResult['chief_complaint'],
    );
    final consultationMedications = _asList(_consultationResult['medications']);

    final riskStyle = _riskUi(riskLevel);

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.waving_hand_rounded,
            titleFontSize: 22,
            subtitleFontSize: 12,
            title:
                'Good morning, ${_firstNonEmpty([patient['name'], _patientName, 'Patient'])}',
            subtitle: 'Your clinical profile is up to date.',
            trailing: IconButton(
              onPressed: widget.onLogout,
              icon: const Icon(Icons.logout_rounded, color: AppColors.primary),
              tooltip: 'Logout',
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.all(18),
              child: ErrorBox(message: _error!),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 28),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: PortalCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Risk Level', style: _labelStyle),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(riskStyle.icon, color: riskStyle.color),
                                  const SizedBox(width: 8),
                                  Text(
                                    riskStyle.label,
                                    style: TextStyle(
                                      color: riskStyle.color,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: PortalCard(
                          onTap: () => widget.onOpenTab(2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Next Appointment',
                                style: _labelStyle,
                              ),
                              const SizedBox(height: 8),
                              if (_data['next_appointment'] != null)
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.calendar_month_rounded,
                                      size: 18,
                                      color: AppColors.accent,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _fmtDate(
                                        _data['next_appointment'],
                                        pattern: 'MMM d',
                                      ),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                )
                              else
                                const Text(
                                  'None scheduled',
                                  style: TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  PortalCard(
                    borderColor: const Color(0xFFBFD9F4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.mic_rounded,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Record Consultation',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Upload a consultation audio file. It uses the same backend consultation pipeline as the doctor dashboard.',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: _processingConsultation
                                    ? null
                                    : _recordConsultation,
                                icon: const Icon(Icons.mic_rounded, size: 16),
                                label: Text(
                                  _processingConsultation
                                      ? 'Processing...'
                                      : 'Record',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => widget.onOpenTab(2),
                                icon: const Icon(
                                  Icons.folder_rounded,
                                  size: 16,
                                ),
                                label: const Text(
                                  'Records',
                                  style: TextStyle(fontSize: 12),
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (_consultationError != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            _consultationError!,
                            style: const TextStyle(
                              color: Color(0xFFB91C1C),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        if (hasConsultation) ...[
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'Latest Result',
                                      style: _labelStyle,
                                    ),
                                    const Spacer(),
                                    if (consultationRisk.isNotEmpty)
                                      StatusChip(
                                        text: consultationRisk,
                                        color: AppColors.accent,
                                        bg: const Color(0xFFEAF3FD),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  consultationChiefComplaint.isEmpty
                                      ? 'Consultation saved successfully.'
                                      : consultationChiefComplaint,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${consultationMedications.length} medication suggestion${consultationMedications.length == 1 ? '' : 's'}',
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                  ),
                                ),
                                if (consultationVisitId.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: OutlinedButton.icon(
                                      onPressed: _flaggingVisit
                                          ? null
                                          : _flagConsultationVisit,
                                      icon: const Icon(
                                        Icons.flag_rounded,
                                        size: 15,
                                      ),
                                      label: Text(
                                        _flaggingVisit
                                            ? 'Updating...'
                                            : 'Flag for Review',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (lastVisit.isNotEmpty)
                    PortalCard(
                      onTap: () => widget.onOpenTab(2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFFEFF6FF),
                            ),
                            child: const Icon(
                              Icons.local_hospital_outlined,
                              color: AppColors.accent,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Last Visit', style: _labelStyle),
                                const SizedBox(height: 3),
                                Text(
                                  _firstNonEmpty([
                                    lastVisit['chief_complaint'],
                                    'General checkup',
                                  ]),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _fmtDate(lastVisit['date']),
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: AppColors.muted,
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => widget.onOpenTab(3),
                          icon: const Icon(Icons.medication_rounded, size: 16),
                          label: const Text(
                            'Meds',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => widget.onOpenTab(4),
                          icon: const Icon(
                            Icons.monitor_heart_rounded,
                            size: 16,
                          ),
                          label: const Text(
                            'Vitals',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class HealthPassportScreen extends StatefulWidget {
  const HealthPassportScreen({super.key});

  @override
  State<HealthPassportScreen> createState() => _HealthPassportScreenState();
}

class _HealthPassportScreenState extends State<HealthPassportScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  bool _generatingQr = false;
  String? _error;
  Map<String, dynamic> _data = <String, dynamic>{};
  String? _qrToken;
  DateTime? _qrExpiry;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getHealthPassport();
      if (!mounted) {
        return;
      }
      final tokenPayload = response['qr_token'];
      String? token;
      DateTime? expiry;

      if (tokenPayload is Map<String, dynamic>) {
        token = _safeText(tokenPayload['token']);
        expiry = _parseDate(tokenPayload['expires_at']);
      } else {
        token = _safeText(tokenPayload);
      }

      setState(() {
        _data = response;
        _qrToken = token;
        _qrExpiry = expiry;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _generateQr() async {
    setState(() {
      _generatingQr = true;
      _error = null;
    });

    try {
      final response = await _api.generateQrToken();
      final token = _safeText(response['token']).isNotEmpty
          ? _safeText(response['token'])
          : _safeText(response['qr_token']).isNotEmpty
          ? _safeText(response['qr_token'])
          : _safeText(response);
      final expiry = _parseDate(response['expires_at']);

      if (!mounted) {
        return;
      }

      setState(() {
        _qrToken = token;
        _qrExpiry = expiry;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _generatingQr = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = _asMap(_data['patient']);
    final allergies = _asList(_data['allergies']);
    final conditions = _asList(_data['chronic_conditions']);
    final medications = _asList(_data['current_medications']);
    final emergencyContact = _asMap(_data['emergency_contact']);

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.verified_user_rounded,
            title: _firstNonEmpty([patient['name'], 'Health Passport']),
            subtitle:
                '${_firstNonEmpty([patient['age'], '--'])}y • ${_firstNonEmpty([patient['gender'], '--'])} • ${_firstNonEmpty([_data['blood_type'], '--'])}',
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 28),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  PortalCard(
                    borderColor: const Color(0xFFFECACA),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionHeader(
                          icon: Icons.warning_amber_rounded,
                          title: 'Allergies',
                          color: AppColors.danger,
                        ),
                        const SizedBox(height: 8),
                        if (allergies.isEmpty)
                          const Text(
                            'No known allergies',
                            style: TextStyle(color: AppColors.muted),
                          )
                        else
                          ...allergies.map((item) {
                            final allergy = _asMap(item);
                            final severity = _safeText(
                              allergy['severity'],
                            ).toLowerCase();
                            final config = _severityStyle(severity);
                            return Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: config.bg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: config.border),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    config.icon,
                                    color: config.color,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _firstNonEmpty([
                                            allergy['name'],
                                            'Allergy',
                                          ]),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          _firstNonEmpty([
                                            allergy['reaction'],
                                            '--',
                                          ]),
                                          style: const TextStyle(
                                            color: AppColors.muted,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusChip(
                                    text: severity.isEmpty
                                        ? 'unknown'
                                        : severity,
                                    color: config.color,
                                    bg: config.bg,
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PortalCard(
                    borderColor: const Color(0xFFFDE68A),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionHeader(
                          icon: Icons.favorite_rounded,
                          title: 'Chronic Conditions',
                          color: AppColors.warning,
                        ),
                        const SizedBox(height: 8),
                        if (conditions.isEmpty)
                          const Text(
                            'No chronic conditions recorded',
                            style: TextStyle(color: AppColors.muted),
                          )
                        else
                          ...conditions.map((item) {
                            final condition = _asMap(item);
                            final managed =
                                _safeText(condition['status']).toLowerCase() ==
                                'managed';
                            return Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: const Color(0xFFFDE68A),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.monitor_heart_rounded,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _firstNonEmpty([
                                            condition['name'],
                                            'Condition',
                                          ]),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          'Since ${_firstNonEmpty([condition['since'], '--'])}',
                                          style: const TextStyle(
                                            color: AppColors.muted,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusChip(
                                    text: managed ? 'managed' : 'active',
                                    color: managed
                                        ? AppColors.success
                                        : AppColors.danger,
                                    bg: managed
                                        ? const Color(0xFFF0FDF4)
                                        : const Color(0xFFFEF2F2),
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PortalCard(
                    borderColor: const Color(0xFF99F6E4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionHeader(
                          icon: Icons.medication_rounded,
                          title: 'Current Medications',
                          color: AppColors.primary,
                        ),
                        const SizedBox(height: 8),
                        if (medications.isEmpty)
                          const Text(
                            'No current medications',
                            style: TextStyle(color: AppColors.muted),
                          )
                        else
                          ...medications.take(6).map((item) {
                            final med = _asMap(item);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.medication_rounded,
                                    color: AppColors.primary,
                                    size: 17,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _firstNonEmpty([
                                            med['generic_name'],
                                            med['name'],
                                            'Medication',
                                          ]),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          '${_firstNonEmpty([med['dose'], '--'])} • ${_firstNonEmpty([med['frequency'], '--'])}',
                                          style: const TextStyle(
                                            color: AppColors.muted,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (emergencyContact.isNotEmpty)
                    PortalCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _SectionHeader(
                            icon: Icons.contact_emergency_rounded,
                            title: 'Emergency Contact',
                            color: AppColors.accent,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _firstNonEmpty([
                              emergencyContact['name'],
                              'Contact',
                            ]),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _firstNonEmpty([
                              emergencyContact['relation'],
                              'Relation unknown',
                            ]),
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(
                                Icons.phone_rounded,
                                size: 15,
                                color: AppColors.accent,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                _firstNonEmpty([
                                  emergencyContact['phone'],
                                  '--',
                                ]),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  _PrimaryButton(
                    icon: Icons.qr_code_rounded,
                    text: _generatingQr
                        ? 'Generating...'
                        : 'Generate Emergency QR',
                    onPressed: _generatingQr ? null : _generateQr,
                  ),
                  if (_qrToken != null && _qrToken!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    QrCodeCard(token: _qrToken!, expiresAt: _qrExpiry),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class RecordsScreen extends StatefulWidget {
  const RecordsScreen({super.key});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  int _segmentIndex = 0;
  List<dynamic> _visits = <dynamic>[];
  List<Map<String, dynamic>> _documents = <Map<String, dynamic>>[];
  String? _expandedVisitId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final responses = await Future.wait<Map<String, dynamic>>([
        _api.getVisits(),
        _api.getDocuments(),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        _visits = _asList(responses[0]['visits']);
        _documents = _asList(
          responses[1]['documents'],
        ).map((item) => _asMap(item)).toList(growable: false);
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _openDocumentsManager() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const _DocumentsManagerPage()),
    );
    if (mounted) {
      await _loadData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.folder_rounded,
            title: 'Records',
            subtitle:
                '${_visits.length} visit${_visits.length == 1 ? '' : 's'} • '
                '${_documents.length} document${_documents.length == 1 ? '' : 's'}',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  onPressed: _loadData,
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.primary,
                  ),
                  tooltip: 'Refresh records',
                ),
                IconButton(
                  onPressed: _segmentIndex == 1 ? _openDocumentsManager : null,
                  icon: const Icon(Icons.upload_rounded),
                  tooltip: 'Manage and upload documents',
                ),
              ],
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: Text('Visits (${_visits.length})'),
                          selected: _segmentIndex == 0,
                          selectedColor: const Color(0xFFD6E3FF),
                          onSelected: (_) => setState(() => _segmentIndex = 0),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: Text('Medical Docs (${_documents.length})'),
                          selected: _segmentIndex == 1,
                          selectedColor: const Color(0xFFD6E3FF),
                          onSelected: (_) => setState(() => _segmentIndex = 1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_segmentIndex == 0)
                    ..._buildVisitsTimeline()
                  else
                    ..._buildDocumentsList(),
                ],
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _buildVisitsTimeline() {
    if (_visits.isEmpty) {
      return const [
        PortalCard(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(
              child: Text(
                'No visits yet. Your clinical timeline will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted),
              ),
            ),
          ),
        ),
      ];
    }

    return _visits.asMap().entries.map((entry) {
      final index = entry.key;
      final visit = _asMap(entry.value);
      final visitId = _firstNonEmpty([visit['visit_id'], '$index']);
      final isExpanded = _expandedVisitId == visitId;
      final clinicalData = _asMap(visit['clinical_data']);
      final diagnoses = _asList(
        clinicalData['differential_diagnosis'] ?? clinicalData['diagnosis'],
      );
      final meds = _asList(clinicalData['medications']);
      final vitals = _asMap(clinicalData['vitals']);
      final date = _parseDate(visit['date']);

      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 68,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    date == null
                        ? '--'
                        : DateFormat('MMM d').format(date).toUpperCase(),
                    style: TextStyle(
                      color: index == 0 ? AppColors.primary : AppColors.muted,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                  Text(
                    date == null ? '' : DateFormat('yyyy').format(date),
                    style: const TextStyle(
                      color: AppColors.text,
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PortalCard(
                onTap: () {
                  setState(() {
                    _expandedVisitId = isExpanded ? null : visitId;
                  });
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        StatusChip(
                          text: _firstNonEmpty([
                            visit['visit_type'],
                            'In-person',
                          ]),
                          color: AppColors.accent,
                          bg: const Color(0xFFD6E3FF),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _firstNonEmpty([
                              visit['department'],
                              'General Practice',
                            ]),
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        Icon(
                          isExpanded
                              ? Icons.keyboard_arrow_up_rounded
                              : Icons.keyboard_arrow_down_rounded,
                          color: AppColors.muted,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _firstNonEmpty([
                        visit['chief_complaint'],
                        'Clinical Consultation',
                      ]),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    if (!isExpanded &&
                        _safeText(visit['notes']).isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        _safeText(visit['notes']),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                    if (isExpanded) ...[
                      const SizedBox(height: 10),
                      if (diagnoses.isNotEmpty)
                        _InfoSection(
                          icon: Icons.medical_information_rounded,
                          title: 'Primary Diagnosis',
                          child: Column(
                            children: diagnoses.map((item) {
                              final diagnosis = _asMap(item);
                              return Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F6FB),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  _firstNonEmpty([
                                    diagnosis['name'],
                                    diagnosis,
                                  ]),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      if (vitals.isNotEmpty)
                        _InfoSection(
                          icon: Icons.monitor_heart_rounded,
                          title: 'Vitals',
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (_safeText(vitals['BP']).isNotEmpty)
                                _TinyStatBox(
                                  label: 'BP',
                                  value: _safeText(vitals['BP']),
                                  bg: const Color(0xFFEAF3FD),
                                ),
                              if (_safeText(vitals['pulse']).isNotEmpty)
                                _TinyStatBox(
                                  label: 'Pulse',
                                  value: '${_safeText(vitals['pulse'])} bpm',
                                  bg: const Color(0xFFF4F8FD),
                                ),
                              if (_safeText(vitals['temp']).isNotEmpty)
                                _TinyStatBox(
                                  label: 'Temp',
                                  value: _safeText(vitals['temp']),
                                  bg: const Color(0xFFFFFBEB),
                                ),
                            ],
                          ),
                        ),
                      if (meds.isNotEmpty)
                        _InfoSection(
                          icon: Icons.medication_rounded,
                          title: 'Prescribed Medications',
                          child: Column(
                            children: meds.map((item) {
                              final med = _asMap(item);
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F6FB),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.medication_rounded,
                                      size: 16,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _firstNonEmpty([
                                          med['generic_name'],
                                          med['name'],
                                          'Medication',
                                        ]),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  List<Widget> _buildDocumentsList() {
    final widgets = <Widget>[
      Align(
        alignment: Alignment.centerRight,
        child: OutlinedButton.icon(
          onPressed: _openDocumentsManager,
          icon: const Icon(Icons.upload_rounded, size: 18),
          label: const Text('Manage / Upload'),
        ),
      ),
      const SizedBox(height: 8),
    ];

    if (_documents.isEmpty) {
      widgets.add(
        const PortalCard(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(
              child: Text(
                'No records uploaded yet. Use Manage / Upload to add files.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted),
              ),
            ),
          ),
        ),
      );
      return widgets;
    }

    widgets.addAll(
      _documents.map((doc) {
        final style = _documentStyle(_safeText(doc['doc_type']));
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: PortalCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: style.bg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(style.icon, color: style.color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _firstNonEmpty([doc['title'], 'Untitled Document']),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          StatusChip(
                            text: style.label,
                            color: style.color,
                            bg: style.bg,
                          ),
                          if (_safeText(doc['report_date']).isNotEmpty)
                            StatusChip(
                              text: _fmtDate(doc['report_date']),
                              color: AppColors.muted,
                              bg: const Color(0xFFF8FAFC),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.muted),
              ],
            ),
          ),
        );
      }),
    );

    return widgets;
  }
}

class _DocumentsManagerPage extends StatelessWidget {
  const _DocumentsManagerPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: SafeArea(child: DocumentsScreen()));
  }
}

class VisitsScreen extends StatefulWidget {
  const VisitsScreen({super.key});

  @override
  State<VisitsScreen> createState() => _VisitsScreenState();
}

class _VisitsScreenState extends State<VisitsScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  List<dynamic> _visits = <dynamic>[];
  String? _expandedVisitId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getVisits();
      if (!mounted) {
        return;
      }
      setState(() {
        _visits = _asList(response['visits']);
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.event_note_rounded,
            title: 'Visit History',
            subtitle:
                '${_visits.length} visit${_visits.length == 1 ? '' : 's'} on record',
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  if (_visits.isEmpty)
                    const PortalCard(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 30),
                        child: Center(
                          child: Text(
                            'No visits yet. Your consultation history appears here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted),
                          ),
                        ),
                      ),
                    )
                  else
                    ..._visits.asMap().entries.map((entry) {
                      final index = entry.key;
                      final visit = _asMap(entry.value);
                      final visitId = _firstNonEmpty([
                        visit['visit_id'],
                        '$index',
                      ]);
                      final isExpanded = _expandedVisitId == visitId;
                      final clinicalData = _asMap(visit['clinical_data']);

                      final diagnoses = _asList(
                        clinicalData['differential_diagnosis'] ??
                            clinicalData['diagnosis'],
                      );
                      final meds = _asList(clinicalData['medications']);
                      final vitals = _asMap(clinicalData['vitals']);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: PortalCard(
                          onTap: () {
                            setState(() {
                              _expandedVisitId = isExpanded ? null : visitId;
                            });
                          },
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 11,
                                    height: 11,
                                    decoration: BoxDecoration(
                                      color: index == 0
                                          ? AppColors.warning
                                          : AppColors.success,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _fmtDate(visit['date']),
                                          style: const TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _firstNonEmpty([
                                            visit['chief_complaint'],
                                            'General checkup',
                                          ]),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        if (_safeText(
                                          visit['language'],
                                        ).isNotEmpty)
                                          Text(
                                            'Language: ${_safeText(visit['language'])}',
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 12,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    isExpanded
                                        ? Icons.keyboard_arrow_up_rounded
                                        : Icons.keyboard_arrow_down_rounded,
                                    color: AppColors.muted,
                                  ),
                                ],
                              ),
                              if (!isExpanded && meds.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: meds.take(3).map((item) {
                                    final med = _asMap(item);
                                    return StatusChip(
                                      text: _firstNonEmpty([
                                        med['generic_name'],
                                        med['name'],
                                        'Medication',
                                      ]),
                                      color: AppColors.primary,
                                      bg: const Color(0xFFE6FFFA),
                                    );
                                  }).toList(),
                                ),
                              ],
                              if (isExpanded) ...[
                                const SizedBox(height: 12),
                                const Divider(height: 1),
                                const SizedBox(height: 12),
                                if (diagnoses.isNotEmpty)
                                  _InfoSection(
                                    icon: Icons.medical_information_rounded,
                                    title: 'Diagnosis',
                                    child: Column(
                                      children: diagnoses.map((item) {
                                        final diagnosis = _asMap(item);
                                        return Container(
                                          width: double.infinity,
                                          margin: const EdgeInsets.only(
                                            bottom: 6,
                                          ),
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF8FAFC),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  _firstNonEmpty([
                                                    diagnosis['name'],
                                                    diagnosis,
                                                  ]),
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                              if (diagnosis['probability'] !=
                                                  null)
                                                Text(
                                                  '${diagnosis['probability']}%',
                                                  style: const TextStyle(
                                                    color: AppColors.muted,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                if (vitals.isNotEmpty)
                                  _InfoSection(
                                    icon: Icons.monitor_heart_rounded,
                                    title: 'Vitals Recorded',
                                    child: Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        if (_safeText(vitals['BP']).isNotEmpty)
                                          _TinyStatBox(
                                            label: 'Blood Pressure',
                                            value: _safeText(vitals['BP']),
                                            bg: const Color(0xFFF0FDF4),
                                          ),
                                        if (_safeText(
                                          vitals['pulse'],
                                        ).isNotEmpty)
                                          _TinyStatBox(
                                            label: 'Pulse',
                                            value:
                                                '${_safeText(vitals['pulse'])} bpm',
                                            bg: const Color(0xFFEFF6FF),
                                          ),
                                        if (_safeText(
                                          vitals['temp'],
                                        ).isNotEmpty)
                                          _TinyStatBox(
                                            label: 'Temperature',
                                            value: _safeText(vitals['temp']),
                                            bg: const Color(0xFFFFFBEB),
                                          ),
                                        if (_safeText(
                                          vitals['weight'],
                                        ).isNotEmpty)
                                          _TinyStatBox(
                                            label: 'Weight',
                                            value: _safeText(vitals['weight']),
                                            bg: const Color(0xFFFAF5FF),
                                          ),
                                      ],
                                    ),
                                  ),
                                if (meds.isNotEmpty)
                                  _InfoSection(
                                    icon: Icons.medication_rounded,
                                    title: 'Medications Prescribed',
                                    child: Column(
                                      children: meds.map((item) {
                                        final med = _asMap(item);
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            bottom: 8,
                                          ),
                                          child: Row(
                                            children: [
                                              const Icon(
                                                Icons.medication_rounded,
                                                size: 16,
                                                color: AppColors.primary,
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  _firstNonEmpty([
                                                    med['generic_name'],
                                                    med['name'],
                                                    'Medication',
                                                  ]),
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                              ),
                                              Text(
                                                '${_safeText(med['dose'])} • ${_safeText(med['frequency'])}',
                                                style: const TextStyle(
                                                  color: AppColors.muted,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class MedicationsScreen extends StatefulWidget {
  const MedicationsScreen({super.key});

  @override
  State<MedicationsScreen> createState() => _MedicationsScreenState();
}

class _MedicationsScreenState extends State<MedicationsScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  List<dynamic> _allMedications = <dynamic>[];
  bool _activeTab = true;
  String _searchText = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getMedications();
      if (!mounted) {
        return;
      }
      setState(() {
        _allMedications = _asList(response['medications']);
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _uniqueActive {
    final seen = <String>{};
    final unique = <Map<String, dynamic>>[];

    for (final item in _allMedications) {
      final med = _asMap(item);
      final key = _firstNonEmpty([
        med['generic_name'],
        med['name'],
        'unknown',
      ]).toLowerCase();
      if (seen.contains(key)) {
        continue;
      }
      seen.add(key);
      unique.add(med);
    }
    return unique.take(10).toList();
  }

  List<Map<String, dynamic>> get _history {
    return _allMedications.map((item) => _asMap(item)).where((med) {
      if (_searchText.trim().isEmpty) {
        return true;
      }
      final text = _firstNonEmpty([
        med['generic_name'],
        med['name'],
        '',
      ]).toLowerCase();
      return text.contains(_searchText.toLowerCase());
    }).toList();
  }

  Future<void> _markTaken(String medName) async {
    try {
      await _api.logMedication(<String, dynamic>{
        'medication_name': medName,
        'scheduled_at': DateTime.now().toIso8601String(),
        'status': 'taken',
      });
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Medication logged as taken.')),
      );
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _requestRefill(String medName) async {
    final noteController = TextEditingController();

    final shouldSend = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: SizedBox(width: 60, child: Divider(thickness: 3)),
              ),
              const SizedBox(height: 10),
              const Text(
                'Request Refill',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
              ),
              const SizedBox(height: 3),
              Text(medName, style: const TextStyle(color: AppColors.muted)),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                minLines: 3,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Notes for doctor (optional)',
                  hintText: 'Running low, request refill by next week',
                ),
              ),
              const SizedBox(height: 12),
              _PrimaryButton(
                icon: Icons.send_rounded,
                text: 'Send Refill Request',
                onPressed: () => Navigator.of(context).pop(true),
              ),
            ],
          ),
        );
      },
    );

    if (shouldSend != true) {
      noteController.dispose();
      return;
    }

    try {
      await _api.requestRefill(<String, dynamic>{
        'medication_name': medName,
        'notes': noteController.text,
      });
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Refill request sent.')));
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      noteController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _uniqueActive;
    final history = _history;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.medication_rounded,
            title: 'Medications',
            subtitle:
                '${active.length} active • ${_allMedications.length} total',
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: Text('Active (${active.length})'),
                          selected: _activeTab,
                          onSelected: (_) => setState(() => _activeTab = true),
                          selectedColor: const Color(0xFFE6FFFA),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: Text('History (${_allMedications.length})'),
                          selected: !_activeTab,
                          onSelected: (_) => setState(() => _activeTab = false),
                          selectedColor: const Color(0xFFE6FFFA),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_activeTab) ...[
                    if (active.isEmpty)
                      const PortalCard(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 30),
                          child: Center(
                            child: Text(
                              'No active medications',
                              style: TextStyle(color: AppColors.muted),
                            ),
                          ),
                        ),
                      )
                    else
                      ...active.map((med) {
                        final medName = _firstNonEmpty([
                          med['generic_name'],
                          med['name'],
                          'Medication',
                        ]);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: PortalCard(
                            borderColor: const Color(0xFF99F6E4),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.medication_rounded,
                                      color: AppColors.primary,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        medName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (_asList(med['brand_names']).isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Brands: ${_asList(med['brand_names']).join(', ')}',
                                    style: const TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _TinyStatBox(
                                        label: 'Dose',
                                        value: _firstNonEmpty([
                                          med['dose'],
                                          'N/A',
                                        ]),
                                        bg: const Color(0xFFF8FAFC),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _TinyStatBox(
                                        label: 'Frequency',
                                        value: _firstNonEmpty([
                                          med['frequency'],
                                          'N/A',
                                        ]),
                                        bg: const Color(0xFFF8FAFC),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Duration: ${_firstNonEmpty([med['duration'], 'Ongoing'])}',
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 12,
                                  ),
                                ),
                                if (_safeText(
                                  med['prescribed_date'],
                                ).isNotEmpty)
                                  Text(
                                    'Prescribed: ${_fmtDate(med['prescribed_date'])}',
                                    style: const TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _PrimaryButton(
                                        icon: Icons.check_circle_rounded,
                                        text: 'Mark Taken',
                                        compact: true,
                                        onPressed: () => _markTaken(medName),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: () =>
                                            _requestRefill(medName),
                                        icon: const Icon(
                                          Icons.refresh_rounded,
                                          size: 16,
                                        ),
                                        label: const Text('Refill'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                  ] else ...[
                    TextField(
                      onChanged: (value) => setState(() => _searchText = value),
                      decoration: const InputDecoration(
                        hintText: 'Search medication history',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (history.isEmpty)
                      const Text(
                        'No medications found',
                        style: TextStyle(color: AppColors.muted),
                      )
                    else
                      ...history.map((med) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: PortalCard(
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.history_rounded,
                                  color: AppColors.muted,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _firstNonEmpty([
                                          med['generic_name'],
                                          med['name'],
                                          'Medication',
                                        ]),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        '${_firstNonEmpty([med['dose'], '--'])} • ${_firstNonEmpty([med['frequency'], '--'])} • ${_firstNonEmpty([med['duration'], '--'])}',
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  _fmtDate(
                                    med['prescribed_date'],
                                    pattern: 'MMM yyyy',
                                  ),
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class VitalsScreen extends StatefulWidget {
  const VitalsScreen({super.key});

  @override
  State<VitalsScreen> createState() => _VitalsScreenState();
}

class _VitalsScreenState extends State<VitalsScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _vitals = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getVitals(days: 90);
      final list = _asList(
        response['vitals'],
      ).map((item) => _asMap(item)).toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _vitals = list;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> _seriesFrom(
    String key,
    String valueKey,
    DateFormat formatter,
  ) {
    final list = <Map<String, dynamic>>[];

    for (final item in _vitals) {
      final value = item[key];
      if (value == null) {
        continue;
      }
      final date = _parseDate(item['logged_at']);
      list.add(<String, dynamic>{
        'date': date == null ? '' : formatter.format(date),
        valueKey: value,
      });
    }

    return list;
  }

  String _trendLabel(List<double> values, {required bool goodWhenDown}) {
    if (values.length < 2) {
      return 'Stable';
    }

    final last = values.last;
    final prev = values[values.length - 2];

    if (last > prev) {
      return goodWhenDown ? 'Rising' : 'Improving';
    }
    if (last < prev) {
      return goodWhenDown ? 'Improving' : 'Dropping';
    }
    return 'Stable';
  }

  Color _trendColor(String label, {required bool goodWhenDown}) {
    if (label == 'Stable') {
      return AppColors.muted;
    }
    if (label == 'Improving') {
      return AppColors.success;
    }
    if (label == 'Rising' || label == 'Dropping') {
      return goodWhenDown ? AppColors.warning : AppColors.success;
    }
    return AppColors.muted;
  }

  Future<void> _openLogVitalsSheet() async {
    final systolic = TextEditingController();
    final diastolic = TextEditingController();
    final sugar = TextEditingController();
    final weight = TextEditingController();
    final pulse = TextEditingController();
    final spo2 = TextEditingController();

    final shouldSave = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 18,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(
                  child: SizedBox(width: 60, child: Divider(thickness: 3)),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Log Today\'s Vitals',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: systolic,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'BP Systolic',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: diastolic,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'BP Diastolic',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: sugar,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Blood Sugar (Fasting)',
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: weight,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Weight (kg)',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: pulse,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Pulse'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: spo2,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'SpO2 (%)'),
                ),
                const SizedBox(height: 14),
                _PrimaryButton(
                  icon: Icons.save_rounded,
                  text: 'Save Vitals',
                  onPressed: () => Navigator.of(context).pop(true),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (shouldSave != true) {
      systolic.dispose();
      diastolic.dispose();
      sugar.dispose();
      weight.dispose();
      pulse.dispose();
      spo2.dispose();
      return;
    }

    final payload = <String, dynamic>{};

    final s = int.tryParse(systolic.text.trim());
    final d = int.tryParse(diastolic.text.trim());
    final sg = int.tryParse(sugar.text.trim());
    final w = double.tryParse(weight.text.trim());
    final p = int.tryParse(pulse.text.trim());
    final o = int.tryParse(spo2.text.trim());

    if (s != null) {
      payload['bp_systolic'] = s;
    }
    if (d != null) {
      payload['bp_diastolic'] = d;
    }
    if (sg != null) {
      payload['blood_sugar_fasting'] = sg;
    }
    if (w != null) {
      payload['weight_kg'] = w;
    }
    if (p != null) {
      payload['pulse'] = p;
    }
    if (o != null) {
      payload['spo2'] = o;
    }

    try {
      await _api.logVitals(payload);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vitals saved successfully.')),
      );
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      systolic.dispose();
      diastolic.dispose();
      sugar.dispose();
      weight.dispose();
      pulse.dispose();
      spo2.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('MMM d');

    final bpData = <Map<String, dynamic>>[];
    final sugarData = _seriesFrom('blood_sugar_fasting', 'value', formatter);
    final weightData = _seriesFrom('weight_kg', 'value', formatter);

    for (final item in _vitals) {
      final systolic = item['bp_systolic'];
      final diastolic = item['bp_diastolic'];
      if (systolic == null || diastolic == null) {
        continue;
      }
      final date = _parseDate(item['logged_at']);
      bpData.add(<String, dynamic>{
        'date': date == null ? '' : formatter.format(date),
        'systolic': systolic,
        'diastolic': diastolic,
      });
    }

    final bpValues = bpData
        .map((entry) => _toDouble(entry['systolic']))
        .whereType<double>()
        .toList();
    final sugarValues = sugarData
        .map((entry) => _toDouble(entry['value']))
        .whereType<double>()
        .toList();
    final weightValues = weightData
        .map((entry) => _toDouble(entry['value']))
        .whereType<double>()
        .toList();

    final lastBp = bpData.isEmpty ? null : bpData.last;
    final lastSugar = sugarData.isEmpty ? null : sugarData.last;
    final lastWeight = weightData.isEmpty ? null : weightData.last;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.monitor_heart_rounded,
            title: 'Vitals Tracker',
            subtitle: 'Track your vitals over 90 days',
            trailing: IconButton(
              onPressed: _openLogVitalsSheet,
              icon: const Icon(
                Icons.add_circle_rounded,
                color: AppColors.primary,
              ),
              tooltip: 'Log Vitals',
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  PortalCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Blood Pressure',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              _trendLabel(bpValues, goodWhenDown: true),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _trendColor(
                                  _trendLabel(bpValues, goodWhenDown: true),
                                  goodWhenDown: true,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (lastBp != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Last: ${lastBp['systolic']}/${lastBp['diastolic']} mmHg',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        VitalsLineChart(
                          data: bpData,
                          series: const [
                            VitalsSeries(
                              key: 'systolic',
                              label: 'Systolic',
                              color: AppColors.danger,
                            ),
                            VitalsSeries(
                              key: 'diastolic',
                              label: 'Diastolic',
                              color: Color(0xFF3B82F6),
                            ),
                          ],
                          targetMin: 80,
                          targetMax: 130,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PortalCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Blood Sugar (Fasting)',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              _trendLabel(sugarValues, goodWhenDown: true),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _trendColor(
                                  _trendLabel(sugarValues, goodWhenDown: true),
                                  goodWhenDown: true,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (lastSugar != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Last: ${lastSugar['value']} mg/dL • Target < 126',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        VitalsLineChart(
                          data: sugarData,
                          series: const [
                            VitalsSeries(
                              key: 'value',
                              label: 'Fasting Sugar',
                              color: AppColors.warning,
                            ),
                          ],
                          targetMax: 126,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PortalCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Weight',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              _trendLabel(weightValues, goodWhenDown: false),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _trendColor(
                                  _trendLabel(
                                    weightValues,
                                    goodWhenDown: false,
                                  ),
                                  goodWhenDown: false,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (lastWeight != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Last: ${lastWeight['value']} kg',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        VitalsLineChart(
                          data: weightData,
                          series: const [
                            VitalsSeries(
                              key: 'value',
                              label: 'Weight (kg)',
                              color: Color(0xFF8B5CF6),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _reminders = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getReminders();
      final reminders = _asList(
        response['reminders'],
      ).map((item) => _asMap(item)).toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _reminders = reminders;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _toggleReminder(Map<String, dynamic> reminder) async {
    final id = _safeText(reminder['id']);
    if (id.isEmpty) {
      return;
    }

    try {
      await _api.updateReminder(id, <String, dynamic>{
        'active': !(reminder['active'] == true),
      });
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _deleteReminder(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Reminder?'),
        content: const Text('This reminder will be removed permanently.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    try {
      await _api.deleteReminder(id);
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _openAddReminderSheet() async {
    String type = 'medication';
    String title = '';
    String body = '';
    String recurrence = 'daily';
    TimeOfDay selectedTime = const TimeOfDay(hour: 8, minute: 0);

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Center(
                      child: SizedBox(width: 60, child: Divider(thickness: 3)),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'New Reminder',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: type,
                      items: const [
                        DropdownMenuItem(
                          value: 'medication',
                          child: Text('Medication'),
                        ),
                        DropdownMenuItem(
                          value: 'appointment',
                          child: Text('Appointment'),
                        ),
                        DropdownMenuItem(
                          value: 'vitals',
                          child: Text('Vitals'),
                        ),
                        DropdownMenuItem(value: 'test', child: Text('Test')),
                      ],
                      onChanged: (value) {
                        if (value == null) {
                          return;
                        }
                        setSheetState(() => type = value);
                      },
                      decoration: const InputDecoration(labelText: 'Type'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      onChanged: (value) => title = value,
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        hintText: 'Metformin Morning',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      onChanged: (value) => body = value,
                      decoration: const InputDecoration(
                        labelText: 'Description (optional)',
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: recurrence,
                      items: const [
                        DropdownMenuItem(value: 'daily', child: Text('Daily')),
                        DropdownMenuItem(
                          value: 'weekly',
                          child: Text('Weekly'),
                        ),
                        DropdownMenuItem(
                          value: 'monthly',
                          child: Text('Monthly'),
                        ),
                        DropdownMenuItem(
                          value: 'once',
                          child: Text('One-time'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value == null) {
                          return;
                        }
                        setSheetState(() => recurrence = value);
                      },
                      decoration: const InputDecoration(
                        labelText: 'Recurrence',
                      ),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: selectedTime,
                        );
                        if (picked == null) {
                          return;
                        }
                        setSheetState(() => selectedTime = picked);
                      },
                      icon: const Icon(Icons.schedule_rounded),
                      label: Text('Time: ${selectedTime.format(context)}'),
                    ),
                    const SizedBox(height: 14),
                    _PrimaryButton(
                      icon: Icons.add_alarm_rounded,
                      text: 'Create Reminder',
                      onPressed: title.trim().isEmpty
                          ? null
                          : () => Navigator.of(context).pop(true),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (saved != true) {
      return;
    }

    final hour = selectedTime.hour.toString().padLeft(2, '0');
    final minute = selectedTime.minute.toString().padLeft(2, '0');
    final time = '$hour:$minute';

    try {
      await _api.createReminder(<String, dynamic>{
        'type': type,
        'title': title,
        'body': body,
        'recurrence': recurrence,
        'recurrence_times': <String>[time],
        'channel': <String>['push'],
      });
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<Map<String, dynamic>>>{
      'medication': _reminders
          .where((item) => item['type'] == 'medication')
          .toList(),
      'appointment': _reminders
          .where((item) => item['type'] == 'appointment')
          .toList(),
      'vitals': _reminders.where((item) => item['type'] == 'vitals').toList(),
      'test': _reminders.where((item) => item['type'] == 'test').toList(),
    };

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.notifications_active_rounded,
            title: 'Reminders',
            subtitle:
                '${_reminders.length} active reminder${_reminders.length == 1 ? '' : 's'}',
            trailing: IconButton(
              onPressed: _openAddReminderSheet,
              icon: const Icon(
                Icons.add_circle_rounded,
                color: AppColors.primary,
              ),
              tooltip: 'Add Reminder',
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  if (_reminders.isEmpty)
                    PortalCard(
                      child: Column(
                        children: [
                          const Icon(
                            Icons.alarm_off_rounded,
                            size: 34,
                            color: AppColors.muted,
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'No reminders set',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Add medication, appointment, and vitals alerts.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted),
                          ),
                          const SizedBox(height: 12),
                          _PrimaryButton(
                            icon: Icons.add_alarm_rounded,
                            text: 'Add Reminder',
                            compact: true,
                            onPressed: _openAddReminderSheet,
                          ),
                        ],
                      ),
                    )
                  else
                    ...grouped.entries.map((entry) {
                      final type = entry.key;
                      final items = entry.value;
                      if (items.isEmpty) {
                        return const SizedBox.shrink();
                      }

                      final typeStyle = _reminderStyle(type);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8, top: 2),
                            child: Text(
                              '${typeStyle.label} reminders',
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                          ...items.map((reminder) {
                            final id = _safeText(reminder['id']);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: PortalCard(
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: typeStyle.bg,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        typeStyle.icon,
                                        color: typeStyle.color,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _firstNonEmpty([
                                              reminder['title'],
                                              'Reminder',
                                            ]),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          if (_safeText(
                                            reminder['body'],
                                          ).isNotEmpty)
                                            Text(
                                              _safeText(reminder['body']),
                                              style: const TextStyle(
                                                color: AppColors.muted,
                                                fontSize: 12,
                                              ),
                                            ),
                                          const SizedBox(height: 6),
                                          Wrap(
                                            spacing: 6,
                                            runSpacing: 6,
                                            children: [
                                              StatusChip(
                                                text:
                                                    (_asList(
                                                              reminder['recurrence_times'],
                                                            ).isNotEmpty
                                                            ? _asList(
                                                                reminder['recurrence_times'],
                                                              ).join(', ')
                                                            : _safeText(
                                                                reminder['remind_at'],
                                                              ))
                                                        .replaceAll('T', ' '),
                                                color: AppColors.primary,
                                                bg: const Color(0xFFE6FFFA),
                                              ),
                                              StatusChip(
                                                text: _firstNonEmpty([
                                                  reminder['recurrence'],
                                                  'daily',
                                                ]),
                                                color: AppColors.accent,
                                                bg: const Color(0xFFEEF2FF),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      children: [
                                        Switch(
                                          value: reminder['active'] == true,
                                          activeThumbColor: AppColors.primary,
                                          onChanged: (_) =>
                                              _toggleReminder(reminder),
                                        ),
                                        IconButton(
                                          onPressed: id.isEmpty
                                              ? null
                                              : () => _deleteReminder(id),
                                          icon: const Icon(
                                            Icons.delete_outline_rounded,
                                            color: AppColors.muted,
                                            size: 20,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],
                      );
                    }),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _documents = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getDocuments();
      final docs = _asList(
        response['documents'],
      ).map((item) => _asMap(item)).toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _documents = docs;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _openAddDocumentSheet() async {
    String docType = 'lab_report';
    String title = '';
    DateTime? reportDate;
    Uint8List? selectedFileBytes;
    String? selectedFileName;
    bool selectedIsImage = false;

    Future<void> pickFromCamera(StateSetter setSheetState) async {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 88,
        maxWidth: 2200,
      );
      if (picked == null) {
        return;
      }

      final bytes = await picked.readAsBytes();
      if (bytes.isEmpty) {
        return;
      }

      setSheetState(() {
        selectedFileBytes = bytes;
        selectedFileName = picked.name.isEmpty
            ? 'camera_capture.jpg'
            : picked.name;
        selectedIsImage = true;
      });
    }

    Future<void> pickFromGallery(StateSetter setSheetState) async {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 88,
        maxWidth: 2200,
      );
      if (picked == null) {
        return;
      }

      final bytes = await picked.readAsBytes();
      if (bytes.isEmpty) {
        return;
      }

      setSheetState(() {
        selectedFileBytes = bytes;
        selectedFileName = picked.name.isEmpty
            ? 'gallery_image.jpg'
            : picked.name;
        selectedIsImage = true;
      });
    }

    Future<void> pickFile(StateSetter setSheetState) async {
      final result = await FilePicker.platform.pickFiles(
        withData: true,
        type: FileType.custom,
        allowedExtensions: const <String>[
          'pdf',
          'jpg',
          'jpeg',
          'png',
          'doc',
          'docx',
          'txt',
        ],
      );

      if (result == null || result.files.isEmpty) {
        return;
      }

      final file = result.files.first;
      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not read selected file.')),
        );
        return;
      }

      final name = file.name.trim().isEmpty
          ? 'document_upload'
          : file.name.trim();
      setSheetState(() {
        selectedFileBytes = bytes;
        selectedFileName = name;
        selectedIsImage = _isLikelyImageFile(name);
      });
    }

    final save = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(
                    child: SizedBox(width: 60, child: Divider(thickness: 3)),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Upload Document',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: docType,
                    decoration: const InputDecoration(
                      labelText: 'Document Type',
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'lab_report',
                        child: Text('Lab Report'),
                      ),
                      DropdownMenuItem(
                        value: 'scan',
                        child: Text('Scan / X-ray'),
                      ),
                      DropdownMenuItem(
                        value: 'prescription',
                        child: Text('Prescription'),
                      ),
                      DropdownMenuItem(
                        value: 'discharge_summary',
                        child: Text('Discharge Summary'),
                      ),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (value) {
                      if (value == null) {
                        return;
                      }
                      setSheetState(() => docType = value);
                    },
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    onChanged: (value) => title = value,
                    decoration: const InputDecoration(
                      labelText: 'Title',
                      hintText: 'HbA1c report - Mar 2026',
                    ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        firstDate: DateTime(2000),
                        lastDate: DateTime.now(),
                        initialDate: reportDate ?? DateTime.now(),
                      );
                      if (picked == null) {
                        return;
                      }
                      setSheetState(() => reportDate = picked);
                    },
                    icon: const Icon(Icons.calendar_today_rounded),
                    label: Text(
                      reportDate == null
                          ? 'Select report date'
                          : DateFormat('MMM d, yyyy').format(reportDate!),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => pickFromCamera(setSheetState),
                          icon: const Icon(Icons.photo_camera_rounded),
                          label: const Text('Camera'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => pickFromGallery(setSheetState),
                          icon: const Icon(Icons.photo_library_rounded),
                          label: const Text('Gallery'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => pickFile(setSheetState),
                          icon: const Icon(Icons.attach_file_rounded),
                          label: const Text('Files'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: selectedFileBytes == null
                        ? const Column(
                            children: [
                              Icon(
                                Icons.upload_file_rounded,
                                color: AppColors.muted,
                                size: 30,
                              ),
                              SizedBox(height: 6),
                              Text(
                                'Choose from camera, gallery, or files to upload.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    selectedIsImage
                                        ? Icons.image_rounded
                                        : Icons.insert_drive_file_rounded,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      selectedFileName ?? 'selected_file',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.text,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${(selectedFileBytes!.lengthInBytes / 1024).toStringAsFixed(1)} KB',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              if (selectedIsImage) ...[
                                const SizedBox(height: 10),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.memory(
                                    selectedFileBytes!,
                                    height: 150,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ],
                            ],
                          ),
                  ),
                  const SizedBox(height: 14),
                  _PrimaryButton(
                    icon: Icons.save_rounded,
                    text: 'Save Document',
                    onPressed: title.trim().isEmpty || selectedFileBytes == null
                        ? null
                        : () => Navigator.of(context).pop(true),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (save != true) {
      return;
    }

    try {
      await _api.addDocument(
        <String, dynamic>{
          'doc_type': docType,
          'title': title,
          'report_date': reportDate?.toIso8601String().split('T').first ?? '',
        },
        fileBytes: selectedFileBytes,
        fileName: selectedFileName,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document uploaded successfully.')),
      );
      await _loadData();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  bool _isLikelyImageFile(String fileName) {
    final lower = fileName.toLowerCase();
    return lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif');
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          PortalHeader(
            icon: Icons.folder_open_rounded,
            title: 'MedicalDocs',
            subtitle:
                '${_documents.length} document${_documents.length == 1 ? '' : 's'}',
            trailing: IconButton(
              onPressed: _openAddDocumentSheet,
              icon: const Icon(
                Icons.add_circle_rounded,
                color: AppColors.primary,
              ),
              tooltip: 'Upload',
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
              child: Column(
                children: [
                  if (_error != null) ...[
                    ErrorBox(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  if (_documents.isEmpty)
                    PortalCard(
                      child: Column(
                        children: [
                          const Icon(
                            Icons.description_outlined,
                            size: 36,
                            color: AppColors.muted,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'No documents yet',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Upload lab reports, scans, and prescriptions.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted),
                          ),
                          const SizedBox(height: 10),
                          _PrimaryButton(
                            icon: Icons.upload_rounded,
                            text: 'Upload Document',
                            compact: true,
                            onPressed: _openAddDocumentSheet,
                          ),
                        ],
                      ),
                    )
                  else
                    ..._documents.map((doc) {
                      final style = _documentStyle(_safeText(doc['doc_type']));
                      final extracted = _asMap(doc['extracted_data']);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: PortalCard(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: style.bg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(style.icon, color: style.color),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _firstNonEmpty([
                                        doc['title'],
                                        'Untitled Document',
                                      ]),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 6,
                                      children: [
                                        StatusChip(
                                          text: style.label,
                                          color: style.color,
                                          bg: style.bg,
                                        ),
                                        if (_safeText(
                                          doc['report_date'],
                                        ).isNotEmpty)
                                          StatusChip(
                                            text: _fmtDate(doc['report_date']),
                                            color: AppColors.muted,
                                            bg: const Color(0xFFF8FAFC),
                                          ),
                                      ],
                                    ),
                                    if (extracted.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF0FDF4),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          border: Border.all(
                                            color: const Color(0xFFBBF7D0),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: const [
                                                Icon(
                                                  Icons.auto_awesome_rounded,
                                                  size: 15,
                                                  color: AppColors.success,
                                                ),
                                                SizedBox(width: 6),
                                                Text(
                                                  'AI Extracted Values',
                                                  style: TextStyle(
                                                    color: AppColors.success,
                                                    fontWeight: FontWeight.w700,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Wrap(
                                              spacing: 10,
                                              runSpacing: 6,
                                              children: extracted.entries.map((
                                                entry,
                                              ) {
                                                return Text(
                                                  '${entry.key}: ${entry.value}',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                  ),
                                                );
                                              }).toList(),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key, required this.token});

  static const String routeName = '/emergency';

  final String token;

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  final PatientApiService _api = PatientApiService.instance;

  bool _loading = true;
  String? _error;
  Map<String, dynamic> _data = <String, dynamic>{};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _api.getEmergencyData(widget.token);
      if (!mounted) {
        return;
      }
      setState(() {
        _data = response;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final allergies = _asList(_data['allergies']);
    final meds = _asList(_data['current_medications']);
    final conditions = _asList(_data['chronic_conditions']);
    final emergencyContact = _asMap(_data['emergency_contact']);

    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: const Color(0xFFB91C1C),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(
                                Icons.health_and_safety_rounded,
                                color: Colors.white,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Emergency Health Info',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _firstNonEmpty([
                              _data['patient_name'],
                              'Unknown Patient',
                            ]),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_firstNonEmpty([_data['age'], '--'])}y • ${_firstNonEmpty([_data['gender'], '--'])} • Blood: ${_firstNonEmpty([_data['blood_type'], '--'])}',
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      ErrorBox(message: _error!),
                    ],
                    const SizedBox(height: 12),
                    _EmergencySection(
                      icon: Icons.warning_amber_rounded,
                      title: 'Allergies',
                      color: AppColors.danger,
                      child: allergies.isEmpty
                          ? const Text('No known allergies')
                          : Column(
                              children: allergies.map((item) {
                                final allergy = _asMap(item);
                                final style = _severityStyle(
                                  _safeText(allergy['severity']).toLowerCase(),
                                );
                                return Container(
                                  width: double.infinity,
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: style.bg,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: style.border),
                                  ),
                                  child: Text(
                                    '${_firstNonEmpty([allergy['name'], 'Allergy'])} • ${_firstNonEmpty([allergy['reaction'], ''])}',
                                    style: TextStyle(
                                      color: style.color,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                    ),
                    const SizedBox(height: 10),
                    _EmergencySection(
                      icon: Icons.medication_rounded,
                      title: 'Current Medications',
                      color: AppColors.primary,
                      child: meds.isEmpty
                          ? const Text('No medications on record')
                          : Column(
                              children: meds.map((item) {
                                final med = _asMap(item);
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.medication_rounded,
                                        color: AppColors.primary,
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _firstNonEmpty([
                                            med['generic_name'],
                                            med['name'],
                                            'Medication',
                                          ]),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        _firstNonEmpty([med['dose'], '--']),
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                    ),
                    if (conditions.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _EmergencySection(
                        icon: Icons.favorite_rounded,
                        title: 'Chronic Conditions',
                        color: AppColors.warning,
                        child: Column(
                          children: conditions.map((item) {
                            final condition = _asMap(item);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.circle,
                                    size: 8,
                                    color: AppColors.warning,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${_firstNonEmpty([condition['name'], 'Condition'])} ${_safeText(condition['since']).isEmpty ? '' : '(since ${condition['since']})'}',
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                    if (emergencyContact.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _EmergencySection(
                        icon: Icons.contact_emergency_rounded,
                        title: 'Emergency Contact',
                        color: AppColors.accent,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _firstNonEmpty([
                                emergencyContact['name'],
                                'Contact',
                              ]),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _safeText(emergencyContact['relation']),
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 10),
                            FilledButton.icon(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.accent,
                              ),
                              onPressed: () {},
                              icon: const Icon(Icons.phone_rounded),
                              label: Text(
                                'Call ${_firstNonEmpty([emergencyContact['phone'], '--'])}',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

class PortalHeader extends StatelessWidget {
  const PortalHeader({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.titleFontSize = 24,
    this.subtitleFontSize = 13,
    this.badgeCount,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final double titleFontSize;
  final double subtitleFontSize;
  final int? badgeCount;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF3FD),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: AppColors.primary),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: AppColors.text,
                          fontSize: titleFontSize,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: AppColors.muted,
                          fontSize: subtitleFontSize,
                        ),
                      ),
                    ],
                  ),
                ),
                if (badgeCount != null && badgeCount! > 0)
                  Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF3FD),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.notifications_active_rounded,
                          color: AppColors.accent,
                          size: 15,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$badgeCount',
                          style: const TextStyle(
                            color: AppColors.accent,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ...[trailing].whereType<Widget>(),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class PortalCard extends StatelessWidget {
  const PortalCard({
    super.key,
    required this.child,
    this.onTap,
    this.borderColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: borderColor ?? AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(padding: const EdgeInsets.all(14), child: child),
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.text,
    required this.color,
    required this.bg,
  });

  final String text;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 10,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

class ErrorBox extends StatelessWidget {
  const ErrorBox({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFFB91C1C)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFFB91C1C),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.icon,
    required this.text,
    required this.onPressed,
    this.compact = false,
  });

  final IconData icon;
  final String text;
  final VoidCallback? onPressed;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: compact ? 40 : 48,
      child: FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          disabledBackgroundColor: const Color(0xFF94A3B8),
        ),
        onPressed: onPressed,
        icon: Icon(icon, size: compact ? 16 : 18),
        label: Text(
          text,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: compact ? 13 : 15,
          ),
        ),
      ),
    );
  }
}

class _MiniTrustChip extends StatelessWidget {
  const _MiniTrustChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.muted),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.title,
    required this.color,
  });

  final IconData icon;
  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: AppColors.muted),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.muted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PortalCard(
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 24),
          const SizedBox(height: 7),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _TinyStatBox extends StatelessWidget {
  const _TinyStatBox({
    required this.label,
    required this.value,
    required this.bg,
  });

  final String label;
  final String value;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 120),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 10),
          ),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmergencySection extends StatelessWidget {
  const _EmergencySection({
    required this.icon,
    required this.title,
    required this.color,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(color: color, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _RiskStyle {
  const _RiskStyle(this.label, this.color, this.icon, this.bg);

  final String label;
  final Color color;
  final IconData icon;
  final Color bg;
}

class _SeverityStyle {
  const _SeverityStyle(this.color, this.bg, this.border, this.icon);

  final Color color;
  final Color bg;
  final Color border;
  final IconData icon;
}

class _ReminderStyle {
  const _ReminderStyle(this.label, this.icon, this.color, this.bg);

  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
}

class _DocumentStyle {
  const _DocumentStyle(this.label, this.icon, this.color, this.bg);

  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
}

_RiskStyle _riskUi(String risk) {
  switch (risk.toUpperCase()) {
    case 'HIGH':
      return const _RiskStyle(
        'High Risk',
        AppColors.danger,
        Icons.warning_amber_rounded,
        Color(0xFFFEF2F2),
      );
    case 'MODERATE':
      return const _RiskStyle(
        'Moderate',
        AppColors.warning,
        Icons.error_outline_rounded,
        Color(0xFFFFFBEB),
      );
    default:
      return const _RiskStyle(
        'Low Risk',
        AppColors.success,
        Icons.verified_rounded,
        Color(0xFFF0FDF4),
      );
  }
}

_SeverityStyle _severityStyle(String severity) {
  switch (severity) {
    case 'severe':
      return const _SeverityStyle(
        Color(0xFFDC2626),
        Color(0xFFFEF2F2),
        Color(0xFFFECACA),
        Icons.error_rounded,
      );
    case 'moderate':
      return const _SeverityStyle(
        Color(0xFFD97706),
        Color(0xFFFFFBEB),
        Color(0xFFFDE68A),
        Icons.warning_rounded,
      );
    default:
      return const _SeverityStyle(
        Color(0xFF16A34A),
        Color(0xFFF0FDF4),
        Color(0xFFBBF7D0),
        Icons.check_circle_rounded,
      );
  }
}

_ReminderStyle _reminderStyle(String type) {
  switch (type) {
    case 'appointment':
      return const _ReminderStyle(
        'Appointment',
        Icons.calendar_month_rounded,
        AppColors.accent,
        Color(0xFFEEF2FF),
      );
    case 'vitals':
      return const _ReminderStyle(
        'Vitals',
        Icons.monitor_heart_rounded,
        AppColors.warning,
        Color(0xFFFFFBEB),
      );
    case 'test':
      return const _ReminderStyle(
        'Test',
        Icons.science_rounded,
        Color(0xFFEC4899),
        Color(0xFFFDF2F8),
      );
    default:
      return const _ReminderStyle(
        'Medication',
        Icons.medication_rounded,
        AppColors.primary,
        Color(0xFFF0FDFA),
      );
  }
}

_DocumentStyle _documentStyle(String docType) {
  switch (docType) {
    case 'scan':
      return const _DocumentStyle(
        'Scan',
        Icons.image_rounded,
        AppColors.accent,
        Color(0xFFEEF2FF),
      );
    case 'prescription':
      return const _DocumentStyle(
        'Prescription',
        Icons.description_rounded,
        AppColors.warning,
        Color(0xFFFFFBEB),
      );
    case 'discharge_summary':
      return const _DocumentStyle(
        'Discharge',
        Icons.assignment_turned_in_rounded,
        Color(0xFFEC4899),
        Color(0xFFFDF2F8),
      );
    case 'other':
      return const _DocumentStyle(
        'Other',
        Icons.folder_rounded,
        AppColors.muted,
        Color(0xFFF8FAFC),
      );
    default:
      return const _DocumentStyle(
        'Lab Report',
        Icons.science_rounded,
        AppColors.primary,
        Color(0xFFF0FDFA),
      );
  }
}

Map<String, dynamic> _asMap(dynamic input) {
  if (input is Map<String, dynamic>) {
    return input;
  }
  if (input is Map) {
    return input.map((key, value) => MapEntry('$key', value));
  }
  return <String, dynamic>{};
}

List<dynamic> _asList(dynamic input) {
  if (input is List<dynamic>) {
    return input;
  }
  if (input is List) {
    return input.toList();
  }
  return <dynamic>[];
}

String _safeText(dynamic value) {
  if (value == null) {
    return '';
  }
  if (value is String) {
    return value.trim();
  }
  return '$value'.trim();
}

String _firstNonEmpty(List<dynamic> values) {
  for (final value in values) {
    final text = _safeText(value);
    if (text.isNotEmpty) {
      return text;
    }
  }
  return '';
}

DateTime? _parseDate(dynamic value) {
  final text = _safeText(value);
  if (text.isEmpty) {
    return null;
  }
  return DateTime.tryParse(text);
}

String _fmtDate(dynamic value, {String pattern = 'MMM d, yyyy'}) {
  final date = _parseDate(value);
  if (date == null) {
    return '--';
  }
  return DateFormat(pattern).format(date);
}

int _toInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

double? _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value);
  }
  return null;
}

const TextStyle _labelStyle = TextStyle(
  fontSize: 11,
  color: Color(0xFF94A3B8),
  fontWeight: FontWeight.w700,
  letterSpacing: 0.2,
);
