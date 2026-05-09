import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

class AudioRecorderDialog extends StatefulWidget {
  const AudioRecorderDialog({super.key});

  static Future<Uint8List?> show(BuildContext context) {
    return showDialog<Uint8List?>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AudioRecorderDialog(),
    );
  }

  @override
  State<AudioRecorderDialog> createState() => _AudioRecorderDialogState();
}

class _AudioRecorderDialogState extends State<AudioRecorderDialog> {
  static const _maxRecordingDuration = Duration(seconds: 25);

  final _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  Duration _duration = Duration.zero;
  Timer? _timer;
  String? _path;

  @override
  void dispose() {
    _timer?.cancel();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission required')),
        );
      }
      return;
    }

    if (await _audioRecorder.hasPermission()) {
      final dir = await getTemporaryDirectory();
      _path =
          '${dir.path}/consultation_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _audioRecorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          sampleRate: 16000,
          numChannels: 1,
          echoCancel: true,
          noiseSuppress: true,
        ),
        path: _path!,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _isRecording = true;
        _duration = Duration.zero;
      });

      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          return;
        }
        final nextDuration = _duration + const Duration(seconds: 1);
        setState(() {
          _duration = nextDuration;
        });
        if (nextDuration >= _maxRecordingDuration) {
          _stopRecording();
        }
      });
    }
  }

  Future<void> _stopRecording() async {
    _timer?.cancel();
    final path = await _audioRecorder.stop();
    if (!mounted) {
      return;
    }
    setState(() {
      _isRecording = false;
    });

    if (path != null) {
      final bytes = await File(path).readAsBytes();
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(bytes);
    }
  }

  Future<void> _cancel() async {
    if (_isRecording) {
      await _audioRecorder.stop();
    }
    if (!mounted) {
      return;
    }
    Navigator.of(context).pop();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "$twoDigitMinutes:$twoDigitSeconds";
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Record Consultation'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _isRecording
                ? 'Recording... stops at 25 seconds'
                : 'Tap Mic to start recording',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 20),
          Text(
            _formatDuration(_duration),
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              shape: const CircleBorder(),
              padding: const EdgeInsets.all(24),
              backgroundColor: _isRecording
                  ? Colors.red
                  : Theme.of(context).primaryColor,
            ),
            onPressed: () {
              if (_isRecording) {
                _stopRecording();
              } else {
                _startRecording();
              }
            },
            child: Icon(
              _isRecording ? Icons.stop : Icons.mic,
              size: 32,
              color: Colors.white,
            ),
          ),
        ],
      ),
      actions: [
        if (!_isRecording)
          TextButton(onPressed: _cancel, child: const Text('Cancel'))
        else
          TextButton(
            onPressed: _cancel,
            child: const Text('Discard', style: TextStyle(color: Colors.red)),
          ),
      ],
    );
  }
}
