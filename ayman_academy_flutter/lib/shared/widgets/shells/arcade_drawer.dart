import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';

/// One entry in the app drawer.
class ArcadeDrawerItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  /// Destructive entries (sign out) take [Arc.danger] so they never look like
  /// another place to navigate to.
  final bool danger;

  /// Draw a pixel divider above this item, grouping the list.
  final bool startsGroup;

  const ArcadeDrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
    this.startsGroup = false,
  });
}

/// The app drawer, shared by the student and teacher shells.
///
/// The two shells had a byte-identical drawer implementation apart from their
/// item lists, which is how the student drawer's items drifted out of step with
/// the teacher's. The chrome lives here now; the shells pass only [items].
class ArcadeDrawer extends StatelessWidget {
  final String name;
  final String? email;
  final String? avatarUrl;

  /// Role label shown under the brand mark, e.g. "طالب" / "Teacher".
  final String roleLabel;

  final List<ArcadeDrawerItem> items;

  const ArcadeDrawer({
    super.key,
    required this.name,
    required this.roleLabel,
    required this.items,
    this.email,
    this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;

    return Drawer(
      // A hard rule down the drawer's inner edge, so it reads as a panel laid
      // over the app rather than as a slice of the same surface.
      shape: BorderDirectional(
        end: BorderSide(color: arc.line, width: Arc.borderWidth),
      ),
      child: Column(
        children: [
          // ── Deep green header band ──
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(
              18,
              MediaQuery.of(context).padding.top + 20,
              18,
              18,
            ),
            decoration: BoxDecoration(
              gradient: arc.gradient,
              border: Border(bottom: BorderSide(color: arc.line, width: Arc.borderWidth)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const BrandLogo(size: 30, onDark: true, markOnly: true),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        roleLabel,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: arc.onInkMuted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    AvatarWidget(name: name, imageUrl: avatarUrl, radius: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                              color: arc.onInk,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (email != null && email!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              email!,
                              // Emails are Latin even in an Arabic UI, so the
                              // run is pinned LTR to stop the RTL paragraph
                              // direction reordering the domain.
                              textDirection: TextDirection.ltr,
                              style: TextStyle(color: arc.onInkMuted, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                for (final item in items) ...[
                  if (item.startsGroup)
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: PixelDivider(height: 3),
                    ),
                  _DrawerRow(item: item),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerRow extends StatelessWidget {
  final ArcadeDrawerItem item;
  const _DrawerRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final fg = item.danger ? arc.danger : arc.ink;

    return InkWell(
      onTap: item.onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // The icon sits in its own bordered square, which is what keeps a
            // drawer of plain rows reading as part of the arcade system.
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: item.danger ? Colors.transparent : arc.wash,
                border: Border.all(color: item.danger ? arc.danger : arc.line, width: Arc.borderWidth),
              ),
              child: Icon(item.icon, size: 17, color: fg),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.label,
                style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 15),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The bottom navigation bar, with the 2px rule that separates it from content.
///
/// `NavigationBar` itself is styled by `navigationBarTheme`; the only thing it
/// cannot express is the top border, which is why this wrapper exists.
class ArcadeNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<NavigationDestination> destinations;

  const ArcadeNavBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(height: Arc.borderWidth, color: arc.line),
        NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: onDestinationSelected,
          destinations: destinations,
        ),
      ],
    );
  }
}
