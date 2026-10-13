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

/// Grades per stage and the gender options. Mirrors GRADE_OPTIONS and GENDERS
/// in src/lib/studentStages.ts — change both together.
const kGradeOptions = <String, List<(int, String, String)>>{
  'kindergarten': [(0, 'التمهيدي', 'Kindergarten')],
  'primary': [
    (1, 'الصف الأول', '1st Grade'), (2, 'الصف الثاني', '2nd Grade'),
    (3, 'الصف الثالث', '3rd Grade'), (4, 'الصف الرابع', '4th Grade'),
    (5, 'الصف الخامس', '5th Grade'), (6, 'الصف السادس', '6th Grade'),
  ],
  'middle': [
    (7, 'الصف السابع', '7th Grade'), (8, 'الصف الثامن', '8th Grade'),
    (9, 'الصف التاسع', '9th Grade'),
  ],
  'high': [
    (10, 'الصف العاشر', '10th Grade'), (11, 'الصف الحادي عشر', '11th Grade'),
    (12, 'الصف الثاني عشر', '12th Grade'),
  ],
};

const kGenders = <(String, String, String)>[
  ('male', 'ذكر', 'Male'),
  ('female', 'أنثى', 'Female'),
  ('unspecified', 'غير محدد', 'Unspecified'),
];
