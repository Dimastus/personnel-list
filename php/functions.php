<?php
    $fileName = fopen('data.json', 'w') or die("Don't create");
    // $fileText = trim(stripslashes(json_encode(file_get_contents('php://input'), true)), '"');
    $fileText = trim(stripslashes(file_get_contents('php://input')), '"');
    fwrite($fileName, $fileText) or die("Don't write");
    fclose($fileName);
    echo $fileText;
?>