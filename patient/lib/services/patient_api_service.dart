import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class SessionStore {
  static const String _tokenKey = 'vc_token';
  static const String _patientIdKey = 'patient_id';
  static const String _patientNameKey = 'patient_name';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<String?> getPatientId() async {
    final token = await getToken();
    final fromToken = _decodePatientIdFromJwt(token);
    if (fromToken != null && fromToken.isNotEmpty) {
      return fromToken;
    }

    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_patientIdKey);
  }

  Future<String?> getPatientName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_patientNameKey);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_patientIdKey);
    await prefs.remove(_patientNameKey);
  }

  Future<void> saveLoginResponse(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();

    final token = _extractToken(data);
    final patientId = _extractPatientId(data) ?? _decodePatientIdFromJwt(token);
    final patientName = _extractPatientName(data);

    if (token != null && token.isNotEmpty) {
      await prefs.setString(_tokenKey, token);
    }
    if (patientId != null && patientId.isNotEmpty) {
      await prefs.setString(_patientIdKey, patientId);
    }
    if (patientName != null && patientName.isNotEmpty) {
      await prefs.setString(_patientNameKey, patientName);
    }
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      return true;
    }
    final patientId = await getPatientId();
    return patientId != null && patientId.isNotEmpty;
  }

  String? _extractToken(Map<String, dynamic> data) {
    final candidates = <dynamic>[
      data['token'],
      data['access_token'],
      data['jwt'],
      data['bearer_token'],
      data['session'] is Map<String, dynamic>
          ? (data['session'] as Map<String, dynamic>)['token']
          : null,
      data['session'] is Map<String, dynamic>
          ? (data['session'] as Map<String, dynamic>)['access_token']
          : null,
      data['data'] is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>)['token']
          : null,
      data['data'] is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>)['access_token']
          : null,
    ];

    for (final candidate in candidates) {
      if (candidate is String && candidate.isNotEmpty) {
        return candidate;
      }
    }
    return null;
  }

  String? _extractPatientId(Map<String, dynamic> data) {
    final candidates = <dynamic>[
      data['patient_id'],
      data['id'],
      data['patient'] is Map<String, dynamic>
          ? (data['patient'] as Map<String, dynamic>)['patient_id']
          : null,
      data['session'] is Map<String, dynamic>
          ? (data['session'] as Map<String, dynamic>)['patient_id']
          : null,
      data['data'] is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>)['patient_id']
          : null,
    ];

    for (final candidate in candidates) {
      if (candidate == null) {
        continue;
      }
      final value = '$candidate'.trim();
      if (value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }

  String? _extractPatientName(Map<String, dynamic> data) {
    final candidates = <dynamic>[
      data['name'],
      data['patient_name'],
      data['patient'] is Map<String, dynamic>
          ? (data['patient'] as Map<String, dynamic>)['name']
          : null,
      data['session'] is Map<String, dynamic>
          ? (data['session'] as Map<String, dynamic>)['name']
          : null,
      data['user'] is Map<String, dynamic>
          ? (data['user'] as Map<String, dynamic>)['name']
          : null,
    ];

    for (final candidate in candidates) {
      if (candidate is String && candidate.trim().isNotEmpty) {
        return candidate.trim();
      }
    }
    return null;
  }

  String? _decodePatientIdFromJwt(String? token) {
    if (token == null || token.trim().isEmpty) {
      return null;
    }

    final parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      final normalized = base64.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(decoded);
      if (payload is Map<String, dynamic>) {
        final patientId = payload['patient_id'];
        if (patientId != null) {
          final value = '$patientId'.trim();
          if (value.isNotEmpty) {
            return value;
          }
        }
      }
    } catch (_) {
      return null;
    }

    return null;
  }
}

class PatientApiService {
  PatientApiService._();

  static final PatientApiService instance = PatientApiService._();

  final SessionStore _sessionStore = SessionStore();

  static const String _apiFromDefine = String.fromEnvironment(
    'API_URL',
    defaultValue: '',
  );

  String get _configuredApiBase {
    final fromEnv = (dotenv.env['API_URL'] ?? '').trim();
    if (fromEnv.isNotEmpty) {
      return fromEnv;
    }

    final fromDefine = _apiFromDefine.trim();
    if (fromDefine.isNotEmpty) {
      return fromDefine;
    }

    return 'http://localhost:8000';
  }

  String get _apiOrigin {
    final raw = _configuredApiBase.trim();
    if (raw.isEmpty) {
      return 'http://localhost:8000';
    }

    final uri = Uri.tryParse(raw);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return raw.replaceFirst(RegExp(r'/+$'), '');
    }

    final port = uri.hasPort ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$port';
  }

  String get _baseUrl {
    return '$_apiOrigin/api/portal';
  }

  Future<Map<String, dynamic>> loginWithEmailPassword(
    String email,
    String password,
  ) async {
    final normalizedEmail = email.trim();
    final normalizedPassword = password.trim();

    final attempts = <Map<String, dynamic>>[
      <String, dynamic>{
        'body': <String, dynamic>{
          'email': normalizedEmail,
          'password': normalizedPassword,
        },
      },
      <String, dynamic>{
        'body': <String, dynamic>{
          'username': normalizedEmail,
          'password': normalizedPassword,
        },
      },
    ];

    final loginUri = Uri.parse('$_apiOrigin/api/auth/login');

    ApiException? lastError;

    for (final attempt in attempts) {
      final body = attempt['body'] is Map<String, dynamic>
          ? attempt['body'] as Map<String, dynamic>
          : null;

      try {
        final response = await http.post(
          loginUri,
          headers: const <String, String>{
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: jsonEncode(body ?? <String, dynamic>{}),
        );

        final responseText = response.body.trim();
        final parsed = responseText.isEmpty
            ? <String, dynamic>{}
            : _safeJsonDecode(responseText);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          final message =
              _extractErrorMessage(parsed) ??
              'Request failed (${response.statusCode}).';
          throw ApiException(message, statusCode: response.statusCode);
        }

        final data = _asMap(parsed);
        await _sessionStore.saveLoginResponse(data);
        return data;
      } on ApiException catch (error) {
        lastError = error;
        final status = error.statusCode;
        final canTryNext = status == 404 || status == 405 || status == 422;
        if (!canTryNext) {
          rethrow;
        }
      }
    }

    if (lastError != null) {
      throw lastError;
    }
    throw ApiException('Login failed. Please try again.');
  }

  Future<Map<String, dynamic>> login(String phone) async {
    final response = await _request(
      method: 'POST',
      path: '/login',
      query: <String, String>{'phone': phone},
      withAuth: false,
    );

    final data = _asMap(response);
    await _sessionStore.saveLoginResponse(data);
    return data;
  }

  Future<Map<String, dynamic>> getProfile() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/me/$id'));
  }

  Future<Map<String, dynamic>> getOverview() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/overview/$id'));
  }

  Future<Map<String, dynamic>> processConsultationAudio({
    required String patientCode,
    required Uint8List audioBytes,
    String fileName = 'consultation.webm',
  }) async {
    final normalizedPatientCode = patientCode.trim();
    if (normalizedPatientCode.isEmpty) {
      throw ApiException('Patient code is missing for consultation upload.');
    }

    if (audioBytes.isEmpty) {
      throw ApiException(
        'Audio file is empty. Please select another recording.',
      );
    }

    final normalizedFileName = fileName.trim().isEmpty
        ? 'consultation.webm'
        : fileName.trim();

    final uri = Uri.parse('$_apiOrigin/api/audio/process');
    final request = http.MultipartRequest('POST', uri)
      ..headers['Accept'] = 'application/json'
      ..fields['patient_id'] = normalizedPatientCode
      ..files.add(
        http.MultipartFile.fromBytes(
          'audio',
          audioBytes,
          filename: normalizedFileName,
        ),
      );

    final token = await _sessionStore.getToken();
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;

    try {
      final streamed = await request.send();
      response = await http.Response.fromStream(streamed);
    } catch (_) {
      throw ApiException('Network error. Please check your connection.');
    }

    final responseText = response.body.trim();
    final parsed = responseText.isEmpty
        ? <String, dynamic>{}
        : _safeJsonDecode(responseText);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _asMap(parsed);
    }

    final message =
        _extractErrorMessage(parsed) ??
        'Request failed (${response.statusCode}).';
    throw ApiException(message, statusCode: response.statusCode);
  }

  Future<Map<String, dynamic>> flagVisitForReview(String visitId) async {
    final normalizedVisitId = visitId.trim();
    if (normalizedVisitId.isEmpty) {
      throw ApiException('Visit id is required.');
    }

    final uri = Uri.parse('$_apiOrigin/api/visits/$normalizedVisitId/flag');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await _sessionStore.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;

    try {
      response = await http.patch(uri, headers: headers);
    } catch (_) {
      throw ApiException('Network error. Please check your connection.');
    }

    final responseText = response.body.trim();
    final parsed = responseText.isEmpty
        ? <String, dynamic>{}
        : _safeJsonDecode(responseText);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _asMap(parsed);
    }

    final message =
        _extractErrorMessage(parsed) ??
        'Request failed (${response.statusCode}).';
    throw ApiException(message, statusCode: response.statusCode);
  }

  Future<Map<String, dynamic>> getHealthPassport() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/health-passport/$id'));
  }

  Future<Map<String, dynamic>> getVisits() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/visits/$id'));
  }

  Future<Map<String, dynamic>> getMedications() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/medications/$id'));
  }

  Future<Map<String, dynamic>> logMedication(Map<String, dynamic> data) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(method: 'POST', path: '/medications/$id/log', body: data),
    );
  }

  Future<Map<String, dynamic>> requestRefill(Map<String, dynamic> data) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(
        method: 'POST',
        path: '/medications/$id/refill',
        body: data,
      ),
    );
  }

  Future<Map<String, dynamic>> getVitals({int days = 90}) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(
        method: 'GET',
        path: '/vitals/$id',
        query: <String, String>{'days': '$days'},
      ),
    );
  }

  Future<Map<String, dynamic>> logVitals(Map<String, dynamic> data) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(method: 'POST', path: '/vitals/$id', body: data),
    );
  }

  Future<Map<String, dynamic>> getReminders() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/reminders/$id'));
  }

  Future<Map<String, dynamic>> createReminder(Map<String, dynamic> data) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(method: 'POST', path: '/reminders/$id', body: data),
    );
  }

  Future<Map<String, dynamic>> updateReminder(
    String reminderId,
    Map<String, dynamic> data,
  ) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(
        method: 'PATCH',
        path: '/reminders/$id/$reminderId',
        body: data,
      ),
    );
  }

  Future<Map<String, dynamic>> deleteReminder(String reminderId) async {
    final id = await _requirePatientId();
    return _asMap(
      await _request(method: 'DELETE', path: '/reminders/$id/$reminderId'),
    );
  }

  Future<Map<String, dynamic>> getDocuments() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'GET', path: '/documents/$id'));
  }

  Future<Map<String, dynamic>> addDocument(
    Map<String, dynamic> data, {
    Uint8List? fileBytes,
    String? fileName,
  }) async {
    final id = await _requirePatientId();

    if (fileBytes == null || fileBytes.isEmpty) {
      return _asMap(
        await _request(method: 'POST', path: '/documents/$id', body: data),
      );
    }

    final uri = Uri.parse('$_baseUrl/documents/$id');
    final request = http.MultipartRequest('POST', uri)
      ..headers['Accept'] = 'application/json';

    final token = await _sessionStore.getToken();
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    data.forEach((key, value) {
      if (value == null) {
        return;
      }
      final text = '$value'.trim();
      if (text.isNotEmpty) {
        request.fields[key] = text;
      }
    });

    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: fileName == null || fileName.trim().isEmpty
            ? 'document_upload'
            : fileName.trim(),
      ),
    );

    http.Response response;

    try {
      final streamed = await request.send();
      response = await http.Response.fromStream(streamed);
    } catch (_) {
      throw ApiException('Network error. Please check your connection.');
    }

    final responseText = response.body.trim();
    final parsed = responseText.isEmpty
        ? <String, dynamic>{}
        : _safeJsonDecode(responseText);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _asMap(parsed);
    }

    final message =
        _extractErrorMessage(parsed) ??
        'Request failed (${response.statusCode}).';
    throw ApiException(message, statusCode: response.statusCode);
  }

  Future<Map<String, dynamic>> generateQrToken() async {
    final id = await _requirePatientId();
    return _asMap(await _request(method: 'POST', path: '/qr/generate/$id'));
  }

  Future<Map<String, dynamic>> getEmergencyData(String token) async {
    return _asMap(
      await _request(method: 'GET', path: '/qr/$token', withAuth: false),
    );
  }

  Future<void> logout() async {
    await _sessionStore.clear();
  }

  Future<bool> isAuthenticated() {
    return _sessionStore.isAuthenticated();
  }

  Future<String?> getPatientName() {
    return _sessionStore.getPatientName();
  }

  Future<dynamic> _request({
    required String method,
    required String path,
    Map<String, String>? query,
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: query);

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (withAuth) {
      final token = await _sessionStore.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    late http.Response response;

    try {
      switch (method.toUpperCase()) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          );
          break;
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          );
          break;
        case 'DELETE':
          response = await http.delete(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          );
          break;
        default:
          throw ApiException('Unsupported method: $method');
      }
    } catch (error) {
      throw ApiException('Network error. Please check your connection.');
    }

    final responseText = response.body.trim();
    final hasContent = responseText.isNotEmpty;
    final parsed = hasContent
        ? _safeJsonDecode(responseText)
        : <String, dynamic>{};

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return parsed;
    }

    final message =
        _extractErrorMessage(parsed) ??
        'Request failed (${response.statusCode}).';
    throw ApiException(message, statusCode: response.statusCode);
  }

  Future<String> _requirePatientId() async {
    final patientId = await _sessionStore.getPatientId();
    if (patientId == null || patientId.isEmpty) {
      throw ApiException(
        'Not authenticated. Please log in again.',
        statusCode: 401,
      );
    }
    return patientId;
  }

  dynamic _safeJsonDecode(String text) {
    try {
      return jsonDecode(text);
    } catch (_) {
      return <String, dynamic>{'message': text};
    }
  }

  String? _extractErrorMessage(dynamic payload) {
    if (payload is Map<String, dynamic>) {
      final candidates = <dynamic>[
        payload['detail'],
        payload['message'],
        payload['error'],
        payload['title'],
      ];
      for (final candidate in candidates) {
        if (candidate is String && candidate.trim().isNotEmpty) {
          return candidate.trim();
        }
      }
    }
    return null;
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map) {
      return data.map((key, value) => MapEntry('$key', value));
    }
    return <String, dynamic>{};
  }
}
