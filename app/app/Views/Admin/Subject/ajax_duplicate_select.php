<form action="<?=base_url('admin/subject/add_duplicate')?>" enctype="multipart/form-data" method="post">
    <div class="row">
        
        <div class="col-lg-12 p-2">
            <label for="subject" class="form-label">Title<span class="required text-danger">*</span></label>
            <select class="form-select" id="subject_id" name="subject" required>
                <option value="" selected disabled>Select Subject</option>
                <?php foreach ($subjects as $subject): ?>
                    <option value="<?= $subject['id'] ?>"><?= $subject['title'] ?>  - [ From course: <?= $subject['course_title']?> ]</option>
                <?php endforeach; ?>
            </select>
            <input type="hidden" class="form-control" id="course_id" name="course_id" value="<?=$course_id?>">
        </div>
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
