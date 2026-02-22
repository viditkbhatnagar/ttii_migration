<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/subject/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
                <div class="row">
                    
                    <div class="col-lg-12 p-2">
                        <div>
                            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                            <input type="text" class="form-control" id="title" name="title" required value="<?=$edit_data['title']?>">
                                                        <input type="hidden" class="form-control" id="course_id" name="course_id" required value="<?=$edit_data['course_id']?>">

                        </div>
                    </div>
                    <div class="col-lg-12 p-2">
                        <div>
                            <label for="description" class="form-label">Description</label>
                            <textarea class="form-control" name="description"><?=$edit_data['description']?></textarea>
                        </div>
                    </div>
                 
                    <div class="col-lg-12 p-2">
                        <div>
                            <label for="thumbnail" class="form-label">Thumbnail (300x300)</label>
                            <input type="file" class="form-control" id="thumbnail" name="thumbnail" >
                        </div>
                    </div>
                    
                <div class="col-12 p-2">
                    <button class="btn btn-success float-end btn-save" type="submit"><i class="ri-check-fill"></i>Save</button>
                </div>
            </div>
        </form>
        <?php
    }
?>