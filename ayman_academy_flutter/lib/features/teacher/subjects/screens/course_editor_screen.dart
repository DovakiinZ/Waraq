import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/stage.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

final _stagesProvider = FutureProvider<List<Stage>>((ref) async {
  final data = await supabase
      .from('stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
  return (data as List).map((e) => Stage.fromJson(e as Map<String, dynamic>)).toList();
});

class CourseEditorScreen extends ConsumerStatefulWidget {
  final String? subjectId; // null = create new
  const CourseEditorScreen({super.key, this.subjectId});

  @override
  ConsumerState<CourseEditorScreen> createState() => _CourseEditorScreenState();
}

class _CourseEditorScreenState extends ConsumerState<CourseEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleArController = TextEditingController();
  final _titleEnController = TextEditingController();
  final _descArController = TextEditingController();
  final _descEnController = TextEditingController();
  final _priceController = TextEditingController();
  String? _selectedStageId;
  bool _isActive = true;
  bool _isPaid = false;
  String _currency = 'SYP';
  bool _loading = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.subjectId != null) _loadSubject();
  }

  Future<void> _loadSubject() async {
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('subjects')
          .select('*')
          .eq('id', widget.subjectId!)
          .maybeSingle();
      if (data == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      _titleArController.text = data['title_ar'] ?? '';
      _titleEnController.text = data['title_en'] ?? '';
      _descArController.text = data['description_ar'] ?? '';
      _descEnController.text = data['description_en'] ?? '';
      _selectedStageId = data['stage_id'];
      _isActive = data['is_active'] ?? true;
      _isPaid = data['is_paid'] ?? false;
      _priceController.text = (data['price_amount'] ?? 0).toString();
      _currency = data['price_currency'] ?? 'SYP';
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final t = ref.read(languageProvider.notifier).t;

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please log in to continue')),
          );
        }
        return;
      }
      final payload = {
        'title_ar': _titleArController.text.trim(),
        'title_en': _titleEnController.text.trim().isNotEmpty ? _titleEnController.text.trim() : null,
        'description_ar': _descArController.text.trim().isNotEmpty ? _descArController.text.trim() : null,
        'description_en': _descEnController.text.trim().isNotEmpty ? _descEnController.text.trim() : null,
        'stage_id': _selectedStageId,
        'is_active': _isActive,
        'is_paid': _isPaid,
        'price_amount': _isPaid ? double.tryParse(_priceController.text) ?? 0 : null,
        'price_currency': _isPaid ? _currency : null,
        'teacher_id': userId,
      };

      if (widget.subjectId != null) {
        await supabase.from('subjects').update(payload).eq('id', widget.subjectId!);
      } else {
        await supabase.from('subjects').insert(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم الحفظ بنجاح', 'Saved successfully')), backgroundColor: AppColors.success),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _titleArController.dispose();
    _titleEnController.dispose();
    _descArController.dispose();
    _descEnController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final stagesAsync = ref.watch(_stagesProvider);
    final isEditing = widget.subjectId != null;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(isEditing ? t('تعديل المادة', 'Edit Subject') : t('مادة جديدة', 'New Subject')),
          actions: [
            TextButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save),
              label: Text(t('حفظ', 'Save')),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Title AR
                      _SectionLabel(t('العنوان بالعربية', 'Title (Arabic)'), required: true),
                      TextFormField(
                        controller: _titleArController,
                        decoration: InputDecoration(
                          hintText: t('أدخل عنوان المادة', 'Enter subject title'),
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? t('مطلوب', 'Required') : null,
                      ),
                      const SizedBox(height: 16),

                      // Title EN
                      _SectionLabel(t('العنوان بالإنجليزية', 'Title (English)')),
                      TextFormField(
                        controller: _titleEnController,
                        textDirection: TextDirection.ltr,
                        decoration: InputDecoration(
                          hintText: 'Enter subject title',
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Description AR
                      _SectionLabel(t('الوصف بالعربية', 'Description (Arabic)')),
                      TextFormField(
                        controller: _descArController,
                        maxLines: 3,
                        decoration: InputDecoration(
                          hintText: t('وصف المادة...', 'Subject description...'),
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Description EN
                      _SectionLabel(t('الوصف بالإنجليزية', 'Description (English)')),
                      TextFormField(
                        controller: _descEnController,
                        maxLines: 3,
                        textDirection: TextDirection.ltr,
                        decoration: InputDecoration(
                          hintText: 'Subject description...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Stage
                      _SectionLabel(t('المرحلة الدراسية', 'Educational Stage')),
                      stagesAsync.when(
                        loading: () => const LinearProgressIndicator(),
                        error: (e, _) => Text('$e'),
                        data: (stages) => DropdownButtonFormField<String>(
                          value: _selectedStageId,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                          ),
                          items: stages.map((s) => DropdownMenuItem(
                            value: s.id,
                            child: Text(s.title(lang)),
                          )).toList(),
                          onChanged: (v) => setState(() => _selectedStageId = v),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Toggles
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: Text(t('نشط', 'Active'), style: const TextStyle(fontWeight: FontWeight.w500))),
                                Switch(value: _isActive, onChanged: (v) => setState(() => _isActive = v)),
                              ],
                            ),
                            const Divider(),
                            Row(
                              children: [
                                Expanded(child: Text(t('مادة مدفوعة', 'Paid Subject'), style: const TextStyle(fontWeight: FontWeight.w500))),
                                Switch(value: _isPaid, onChanged: (v) => setState(() => _isPaid = v)),
                              ],
                            ),
                            if (_isPaid) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    flex: 2,
                                    child: TextFormField(
                                      controller: _priceController,
                                      keyboardType: TextInputType.number,
                                      decoration: InputDecoration(
                                        labelText: t('السعر', 'Price'),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      value: _currency,
                                      decoration: InputDecoration(
                                        border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: 'SYP', child: Text('SYP')),
                                        DropdownMenuItem(value: 'USD', child: Text('USD')),
                                      ],
                                      onChanged: (v) => setState(() => _currency = v ?? 'SYP'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Save button
                      Container(
                        height: 52,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.zero,
                          gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryLight]),
                        ),
                        child: ElevatedButton.icon(
                          onPressed: _saving ? null : _save,
                          icon: _saving
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.save, color: Colors.white),
                          label: Text(
                            isEditing ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء المادة', 'Create Subject'),
                            style: const TextStyle(fontSize: 16, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  final bool required;
  const _SectionLabel(this.text, {this.required = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          if (required)
            const Text(' *', style: TextStyle(color: AppColors.error)),
        ],
      ),
    );
  }
}
