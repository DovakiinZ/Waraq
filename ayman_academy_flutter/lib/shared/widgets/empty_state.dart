import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

/// The app's empty state.
///
/// Thin wrapper over [ArcadeEmpty] so the ~20 screens that already import
/// `EmptyState` pick up the arcade treatment without each one being rewritten,
/// and so there stays exactly one empty state in the app.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return ArcadeEmpty(
      icon: icon,
      title: title,
      subtitle: subtitle,
      action: action,
    );
  }
}
