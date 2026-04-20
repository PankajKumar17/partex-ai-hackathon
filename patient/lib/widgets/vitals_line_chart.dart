import 'dart:math';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class VitalsSeries {
  const VitalsSeries({
    required this.key,
    required this.label,
    required this.color,
  });

  final String key;
  final String label;
  final Color color;
}

class VitalsLineChart extends StatelessWidget {
  const VitalsLineChart({
    super.key,
    required this.data,
    required this.series,
    this.targetMin,
    this.targetMax,
  });

  final List<Map<String, dynamic>> data;
  final List<VitalsSeries> series;
  final double? targetMin;
  final double? targetMax;

  @override
  Widget build(BuildContext context) {
    if (data.length < 2 || series.isEmpty) {
      return const SizedBox(
        height: 210,
        child: Center(
          child: Text(
            'Need at least 2 readings for chart',
            style: TextStyle(color: Color(0xFF94A3B8)),
          ),
        ),
      );
    }

    final values = <double>[];
    final lineBars = <LineChartBarData>[];

    for (final config in series) {
      final points = <FlSpot>[];
      for (var i = 0; i < data.length; i++) {
        final value = _toDouble(data[i][config.key]);
        if (value != null) {
          values.add(value);
          points.add(FlSpot(i.toDouble(), value));
        }
      }

      if (points.isNotEmpty) {
        lineBars.add(
          LineChartBarData(
            spots: points,
            isCurved: true,
            barWidth: 2.5,
            color: config.color,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
                radius: 3.5,
                color: config.color,
                strokeColor: Colors.white,
                strokeWidth: 1.6,
              ),
            ),
          ),
        );
      }
    }

    if (values.isEmpty || lineBars.isEmpty) {
      return const SizedBox(
        height: 210,
        child: Center(
          child: Text(
            'Not enough valid data',
            style: TextStyle(color: Color(0xFF94A3B8)),
          ),
        ),
      );
    }

    final minValue = values.reduce(min);
    final maxValue = values.reduce(max);
    final span = max(10.0, (maxValue - minValue).abs() * 0.15);
    final yMin = (minValue - span).floorToDouble();
    final yMax = (maxValue + span).ceilToDouble();

    return SizedBox(
      height: 210,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, right: 6),
        child: LineChart(
          LineChartData(
            minY: yMin,
            maxY: yMax,
            minX: 0,
            maxX: (data.length - 1).toDouble(),
            borderData: FlBorderData(
              show: true,
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            gridData: FlGridData(
              drawVerticalLine: false,
              getDrawingHorizontalLine: (_) => const FlLine(
                color: Color(0xFFF1F5F9),
                strokeWidth: 1,
              ),
            ),
            extraLinesData: ExtraLinesData(
              horizontalLines: [
                if (targetMin != null)
                  HorizontalLine(
                    y: targetMin!,
                    color: const Color(0xFF10B981).withValues(alpha: 0.35),
                    strokeWidth: 1.4,
                    dashArray: const [6, 3],
                  ),
                if (targetMax != null)
                  HorizontalLine(
                    y: targetMax!,
                    color: const Color(0xFFEF4444).withValues(alpha: 0.35),
                    strokeWidth: 1.4,
                    dashArray: const [6, 3],
                  ),
              ],
            ),
            lineBarsData: lineBars,
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles:
                  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 38,
                  interval: ((yMax - yMin) / 4).clamp(1, 999999),
                  getTitlesWidget: (value, _) => Text(
                    value.toStringAsFixed(0),
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  interval: max(1, (data.length / 4).floor()).toDouble(),
                  getTitlesWidget: (value, _) {
                    final index = value.toInt();
                    if (index < 0 || index >= data.length) {
                      return const SizedBox.shrink();
                    }
                    final date = data[index]['date'];
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        date == null ? '' : '$date',
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipColor: (spots) => const Color(0xFF0F172A),
                getTooltipItems: (spots) => spots.map((spot) {
                  final seriesIndex = spot.barIndex;
                  final line = series[seriesIndex];
                  return LineTooltipItem(
                    '${line.label}: ${spot.y.toStringAsFixed(1)}',
                    const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  double? _toDouble(dynamic input) {
    if (input is num) {
      return input.toDouble();
    }
    if (input is String) {
      return double.tryParse(input);
    }
    return null;
  }
}
