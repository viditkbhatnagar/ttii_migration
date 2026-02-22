<table class="table table-bordered">
  <thead>
    <tr>
      <th>#</th>
      <th>Student ID</th>
      <th>Student</th>
    </tr>
  </thead>
  <tbody>
    <?php if(!empty($unsubmissions)): ?>
    <?php foreach($unsubmissions as $i => $s): ?>
      <tr>
        <td><?= $i+1 ?></td>
        <td><?= esc($s['student_id']) ?></td>
        <td>
            <?php if(!empty($s['profile_picture'])): ?>
                <img src="<?= base_url(get_file($s['profile_picture'])) ?>" alt="<?= esc($s['student_name']) ?>" class="img-fluid rounded-circle" width="40">
            <?php endif; ?>
            <?= !empty($s['student_name']) ? esc($s['student_name']) : 'N/A' ?>
        </td>
      </tr>
    <?php endforeach; ?>
    <?php else: ?>
      <tr>
        <td colspan="5" class="text-center">No Unsubmissions found</td>
      </tr>
    <?php endif; ?>
  </tbody>
</table>
