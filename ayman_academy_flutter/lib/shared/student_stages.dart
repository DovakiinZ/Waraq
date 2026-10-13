import 'package:flutter/material.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

/// The educational stages, shared by onboarding, the profile editor, the
/// marketplace strip and the teacher application. Mirrors STAGES in
/// src/lib/studentStages.ts — change both together.
///
/// The colours are the brand's stage family (coral / sun / sky / green) in
/// their darkened variants, each of which clears 3:1 as an icon colour.
class StageOption {
  final String key;
  final String ar;
  final String en;

  /// Grade span, shown as a sublabel. Latin — needs TextDirection.ltr.
  final String range;

  final IconData icon;
  final Color color;

  const StageOption(this.key, this.ar, this.en, this.range, this.icon, this.color);
}

const kStages = <StageOption>[
  StageOption('kindergarten', 'رياض الأطفال', 'Kindergarten', 'KG',
      Icons.child_care_rounded, AppColors.stageKindergarten),
  StageOption('primary', 'المرحلة الابتدائية', 'Primary', 'Grades 1–6',
      Icons.auto_stories_rounded, AppColors.stagePrimary),
  StageOption('middle', 'المرحلة الإعدادية', 'Middle School', 'Grades 7–9',
      Icons.school_rounded, AppColors.stageMiddle),
  StageOption('high', 'المرحلة الثانوية', 'High School', 'Grades 10–12',
      Icons.workspace_premium_rounded, AppColors.stageSecondary),
];
